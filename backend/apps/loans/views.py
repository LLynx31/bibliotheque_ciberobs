from rest_framework import viewsets, status, mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone

from core.permissions import CanManageRequests
from .models import BorrowRequest, Loan, ExtensionRequest
from .serializers import (
    BorrowRequestSerializer,
    BorrowRequestRejectSerializer,
    BorrowRequestApproveSerializer,
    LoanSerializer,
    LoanCreateSerializer,
    ExtensionRequestSerializer,
)
from .controllers import LoanController

User = get_user_model()


class BorrowRequestViewSet(viewsets.ModelViewSet):
    serializer_class = BorrowRequestSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "book"]
    ordering_fields = ["requested_at"]

    def get_queryset(self):
        user = self.request.user
        if user.can_manage_requests:
            return BorrowRequest.objects.select_related("employee", "book").all()
        return BorrowRequest.objects.select_related("employee", "book").filter(
            employee=user
        )

    http_method_names = ["get", "post", "head", "options"]

    def perform_create(self, serializer):
        borrow_request = serializer.save()
        from apps.notifications.services import send_notification

        managers = User.objects.filter(
            role__in=["admin", "request_manager"], is_active=True
        )
        for manager in managers:
            send_notification(
                recipient=manager,
                notification_type="new_request",
                title="Nouvelle demande d'emprunt",
                message=f'{borrow_request.employee.first_name} {borrow_request.employee.last_name} demande "{borrow_request.book.title}".',
                related_book=borrow_request.book,
            )

    @action(detail=True, methods=["post"], permission_classes=[CanManageRequests])
    def approve(self, request, pk=None):
        borrow_request = self.get_object()
        if borrow_request.status != BorrowRequest.Status.PENDING:
            return Response(
                {"detail": "Cette demande a déjà été traitée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = BorrowRequestApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        due_date = serializer.validated_data.get("due_date")
        try:
            loan = LoanController.approve_borrow_request(
                borrow_request, request.user, due_date=due_date
            )
            return Response(
                LoanSerializer(loan).data, status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"], permission_classes=[CanManageRequests])
    def reject(self, request, pk=None):
        borrow_request = self.get_object()
        if borrow_request.status != BorrowRequest.Status.PENDING:
            return Response(
                {"detail": "Cette demande a déjà été traitée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = BorrowRequestRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        LoanController.reject_borrow_request(
            borrow_request, request.user, serializer.validated_data.get("reason", "")
        )
        return Response(
            BorrowRequestSerializer(borrow_request).data, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        borrow_request = self.get_object()
        if borrow_request.employee != request.user:
            return Response(
                {"detail": "Vous ne pouvez annuler que vos propres demandes."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if borrow_request.status != BorrowRequest.Status.PENDING:
            return Response(
                {"detail": "Seules les demandes en attente peuvent être annulées."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        borrow_request.status = BorrowRequest.Status.CANCELLED
        borrow_request.save()
        return Response(
            BorrowRequestSerializer(borrow_request).data, status=status.HTTP_200_OK
        )


class LoanViewSet(viewsets.ModelViewSet):
    serializer_class = LoanSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["employee"]
    ordering_fields = ["borrowed_at", "due_date"]

    def get_queryset(self):
        user = self.request.user
        if user.can_manage_requests:
            return Loan.objects.select_related("employee", "book").all()
        return Loan.objects.select_related("employee", "book").filter(employee=user)

    http_method_names = ["get", "post", "head", "options"]

    def create(self, request, *args, **kwargs):
        if not request.user.can_manage_requests:
            return Response(
                {"detail": "Vous n'avez pas la permission d'assigner un livre."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = LoanCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from apps.books.models import Book

        try:
            book = Book.objects.get(id=serializer.validated_data["book_id"])
            employee = User.objects.get(id=serializer.validated_data["employee_id"])
        except (Book.DoesNotExist, User.DoesNotExist):
            return Response(
                {"detail": "Livre ou employé introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            loan = LoanController.assign_book(
                book,
                employee,
                request.user,
                due_days=serializer.validated_data.get("due_days", 30),
                due_date=serializer.validated_data.get("due_date"),
            )
            return Response(
                LoanSerializer(loan).data, status=status.HTTP_201_CREATED
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"], permission_classes=[CanManageRequests])
    def return_book(self, request, pk=None):
        loan = self.get_object()
        if loan.returned_at is not None:
            return Response(
                {"detail": "Ce livre a déjà été retourné."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        returned_at = request.data.get("returned_at")
        if returned_at:
            from datetime import datetime
            try:
                returned_at = datetime.strptime(returned_at, "%Y-%m-%d")
                returned_at = timezone.make_aware(datetime.combine(returned_at.date(), datetime.min.time()))
            except (ValueError, TypeError):
                return Response(
                    {"detail": "Format de date invalide. Utilisez YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        loan = LoanController.return_book(loan, returned_at=returned_at)
        return Response(LoanSerializer(loan).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def active(self, request):
        qs = self.get_queryset().filter(returned_at__isnull=True)
        serializer = LoanSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[CanManageRequests])
    def overdue(self, request):
        qs = Loan.objects.select_related("employee", "book").filter(
            returned_at__isnull=True, due_date__lt=timezone.now().date()
        )
        serializer = LoanSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def history(self, request):
        qs = self.get_queryset().filter(returned_at__isnull=False)
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = LoanSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = LoanSerializer(qs, many=True)
        return Response(serializer.data)


class ExtensionRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ExtensionRequestSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "loan"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        user = self.request.user
        if user.can_manage_requests:
            qs = ExtensionRequest.objects.select_related(
                "loan", "loan__book", "requested_by"
            ).all()
        else:
            qs = ExtensionRequest.objects.select_related(
                "loan", "loan__book", "requested_by"
            ).filter(requested_by=user)
        # Filter by book id
        book_id = self.request.query_params.get("book")
        if book_id:
            qs = qs.filter(loan__book_id=book_id)
        return qs

    http_method_names = ["get", "post", "head", "options"]

    def perform_create(self, serializer):
        extension = serializer.save()
        from apps.notifications.services import send_notification

        managers = User.objects.filter(
            role__in=["admin", "request_manager"], is_active=True
        )
        for manager in managers:
            send_notification(
                recipient=manager,
                notification_type="new_request",
                title="Demande de prolongation",
                message=f'{extension.requested_by.first_name} {extension.requested_by.last_name} demande une prolongation pour "{extension.loan.book.title}" jusqu\'au {extension.new_due_date.strftime("%d/%m/%Y")}.',
                related_book=extension.loan.book,
                related_loan=extension.loan,
            )

    @action(detail=True, methods=["post"], permission_classes=[CanManageRequests])
    def approve(self, request, pk=None):
        extension = self.get_object()
        if extension.status != ExtensionRequest.Status.PENDING:
            return Response(
                {"detail": "Cette demande a déjà été traitée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        LoanController.approve_extension(extension, request.user)
        return Response(
            ExtensionRequestSerializer(extension).data, status=status.HTTP_200_OK
        )

    @action(detail=True, methods=["post"], permission_classes=[CanManageRequests])
    def reject(self, request, pk=None):
        extension = self.get_object()
        if extension.status != ExtensionRequest.Status.PENDING:
            return Response(
                {"detail": "Cette demande a déjà été traitée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reason = request.data.get("reason", "")
        LoanController.reject_extension(extension, request.user, reason)
        return Response(
            ExtensionRequestSerializer(extension).data, status=status.HTTP_200_OK
        )
