from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import BorrowRequest, Loan, ExtensionRequest
from apps.notifications.services import send_notification, send_notification_to_all


class LoanController:
    @staticmethod
    @transaction.atomic
    def approve_borrow_request(borrow_request, admin_user, due_date=None):
        book = borrow_request.book
        if not book.is_available:
            raise ValueError("Ce livre n'est plus disponible.")

        borrow_request.status = BorrowRequest.Status.APPROVED
        borrow_request.reviewed_at = timezone.now()
        borrow_request.reviewed_by = admin_user
        borrow_request.save()

        # Use provided due_date, or desired_return_date from request, or default 30 days
        if not due_date:
            if borrow_request.desired_return_date:
                due_date = borrow_request.desired_return_date
            else:
                due_date = timezone.now().date() + timedelta(days=30)

        loan = Loan.objects.create(
            employee=borrow_request.employee,
            book=book,
            borrow_request=borrow_request,
            due_date=due_date,
        )

        book.update_availability()

        send_notification(
            recipient=borrow_request.employee,
            notification_type="request_approved",
            title="Demande approuvée",
            message=f'Votre demande pour "{book.title}" a été approuvée. Date de retour prévue : {loan.due_date.strftime("%d/%m/%Y")}.',
            related_book=book,
            related_loan=loan,
        )

        return loan

    @staticmethod
    @transaction.atomic
    def reject_borrow_request(borrow_request, admin_user, reason=""):
        borrow_request.status = BorrowRequest.Status.REJECTED
        borrow_request.reviewed_at = timezone.now()
        borrow_request.reviewed_by = admin_user
        borrow_request.rejection_reason = reason
        borrow_request.save()

        send_notification(
            recipient=borrow_request.employee,
            notification_type="request_rejected",
            title="Demande rejetée",
            message=f'Votre demande pour "{borrow_request.book.title}" a été rejetée. Raison : {reason or "Non spécifiée"}.',
            related_book=borrow_request.book,
        )

    @staticmethod
    @transaction.atomic
    def assign_book(book, employee, admin_user, due_days=30, due_date=None):
        if not book.is_available:
            raise ValueError("Ce livre n'est plus disponible.")

        if not due_date:
            due_date = timezone.now().date() + timedelta(days=due_days)

        loan = Loan.objects.create(
            employee=employee,
            book=book,
            due_date=due_date,
        )

        book.update_availability()

        send_notification(
            recipient=employee,
            notification_type="request_approved",
            title="Livre assigné",
            message=f'Le livre "{book.title}" vous a été assigné. Date de retour prévue : {loan.due_date.strftime("%d/%m/%Y")}.',
            related_book=book,
            related_loan=loan,
        )

        return loan

    @staticmethod
    @transaction.atomic
    def return_book(loan, returned_at=None):
        loan.returned_at = returned_at or timezone.now()
        loan.save()

        loan.book.update_availability()

        send_notification_to_all(
            notification_type="book_available",
            title="Livre disponible",
            message=f'Le livre "{loan.book.title}" est de nouveau disponible.',
            related_book=loan.book,
        )

        return loan

    @staticmethod
    @transaction.atomic
    def approve_extension(extension_request, admin_user):
        loan = extension_request.loan
        extension_request.status = ExtensionRequest.Status.APPROVED
        extension_request.reviewed_at = timezone.now()
        extension_request.reviewed_by = admin_user
        extension_request.save()

        loan.due_date = extension_request.new_due_date
        loan.save()

        send_notification(
            recipient=extension_request.requested_by,
            notification_type="extension_approved",
            title="Prolongation approuvée",
            message=f'Votre demande de prolongation pour "{loan.book.title}" a été approuvée. Nouvelle date de retour : {loan.due_date.strftime("%d/%m/%Y")}.',
            related_book=loan.book,
            related_loan=loan,
        )

    @staticmethod
    @transaction.atomic
    def reject_extension(extension_request, admin_user, reason=""):
        extension_request.status = ExtensionRequest.Status.REJECTED
        extension_request.reviewed_at = timezone.now()
        extension_request.reviewed_by = admin_user
        extension_request.rejection_reason = reason
        extension_request.save()

        send_notification(
            recipient=extension_request.requested_by,
            notification_type="extension_rejected",
            title="Prolongation rejetée",
            message=f'Votre demande de prolongation pour "{extension_request.loan.book.title}" a été rejetée. Raison : {reason or "Non spécifiée"}.',
            related_book=extension_request.loan.book,
            related_loan=extension_request.loan,
        )
