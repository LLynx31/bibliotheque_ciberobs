from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import BorrowRequest, Loan, ExtensionRequest
from apps.books.models import Book
from apps.books.serializers import BookListSerializer

User = get_user_model()


class EmployeeMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "username"]


class BorrowRequestSerializer(serializers.ModelSerializer):
    employee = EmployeeMinimalSerializer(read_only=True)
    book = BookListSerializer(read_only=True)
    book_id = serializers.PrimaryKeyRelatedField(
        queryset=Book.objects.all(),
        source="book",
        write_only=True,
    )
    desired_return_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = BorrowRequest
        fields = [
            "id",
            "employee",
            "book",
            "book_id",
            "status",
            "desired_return_date",
            "requested_at",
            "reviewed_at",
            "reviewed_by",
            "rejection_reason",
            "notes",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "employee",
            "status",
            "requested_at",
            "reviewed_at",
            "reviewed_by",
            "rejection_reason",
            "created_at",
        ]

    def validate_book(self, book):
        if not book.is_available:
            raise serializers.ValidationError(
                "Ce livre n'est pas disponible actuellement."
            )
        return book

    def create(self, validated_data):
        validated_data["employee"] = self.context["request"].user
        return super().create(validated_data)


class BorrowRequestRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class BorrowRequestApproveSerializer(serializers.Serializer):
    due_date = serializers.DateField(required=False, allow_null=True)


class LoanSerializer(serializers.ModelSerializer):
    employee = EmployeeMinimalSerializer(read_only=True)
    book = BookListSerializer(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Loan
        fields = [
            "id",
            "employee",
            "book",
            "borrowed_at",
            "due_date",
            "returned_at",
            "is_active",
            "is_overdue",
            "notes",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "borrowed_at",
            "returned_at",
            "created_at",
        ]


class LoanCreateSerializer(serializers.Serializer):
    book_id = serializers.IntegerField()
    employee_id = serializers.IntegerField()
    due_date = serializers.DateField(required=False, allow_null=True)
    due_days = serializers.IntegerField(default=30, min_value=1, max_value=365, required=False)


class LoanMinimalSerializer(serializers.ModelSerializer):
    employee = EmployeeMinimalSerializer(read_only=True)
    book = BookListSerializer(read_only=True)

    class Meta:
        model = Loan
        fields = ["id", "employee", "book", "borrowed_at", "due_date"]


class ExtensionRequestSerializer(serializers.ModelSerializer):
    requested_by = EmployeeMinimalSerializer(read_only=True)
    loan_detail = LoanMinimalSerializer(source="loan", read_only=True)

    class Meta:
        model = ExtensionRequest
        fields = [
            "id",
            "loan",
            "loan_detail",
            "requested_by",
            "new_due_date",
            "reason",
            "status",
            "reviewed_at",
            "reviewed_by",
            "rejection_reason",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "loan_detail",
            "requested_by",
            "status",
            "reviewed_at",
            "reviewed_by",
            "rejection_reason",
            "created_at",
        ]

    def create(self, validated_data):
        validated_data["requested_by"] = self.context["request"].user
        return super().create(validated_data)
