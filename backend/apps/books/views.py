from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import IsAdminOrReadOnly
from .models import Book, Category
from .serializers import BookSerializer, BookListSerializer, CategorySerializer
from .filters import BookFilter


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ["name"]
    pagination_class = None


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.select_related("category").all()
    permission_classes = [IsAdminOrReadOnly]
    filterset_class = BookFilter
    search_fields = ["title", "author", "category__name"]
    ordering_fields = ["title", "author", "year_published", "created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return BookListSerializer
        return BookSerializer

    def perform_create(self, serializer):
        book = serializer.save()
        # Notify all users about the new book
        from apps.notifications.services import send_notification_to_all

        send_notification_to_all(
            notification_type="new_book",
            title="Nouveau livre ajouté",
            message=f'Le livre "{book.title}" de {book.author} est maintenant disponible.',
            related_book=book,
        )

    def perform_destroy(self, instance):
        if instance.loans.filter(returned_at__isnull=True).exists():
            return Response(
                {"detail": "Impossible de supprimer un livre actuellement emprunté."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        instance.delete()

    @action(detail=False, methods=["get"])
    def available(self, request):
        books = Book.objects.filter(availability="available")
        serializer = BookListSerializer(books, many=True)
        return Response(serializer.data)
