from rest_framework import serializers
from .models import Book, Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]


class BookSerializer(serializers.ModelSerializer):
    is_available = serializers.BooleanField(read_only=True)
    category = CategorySerializer(read_only=True)
    category_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Book
        fields = [
            "id",
            "title",
            "author",
            "edition",
            "publisher",
            "year_published",
            "category",
            "category_name",
            "description",
            "cover_image",
            "number_of_copies",
            "availability",
            "is_available",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "availability", "created_at", "updated_at"]

    def create(self, validated_data):
        category_name = validated_data.pop("category_name", None)
        if category_name:
            category, _ = Category.objects.get_or_create(name=category_name.strip())
            validated_data["category"] = category
        return super().create(validated_data)

    def update(self, instance, validated_data):
        category_name = validated_data.pop("category_name", None)
        if category_name:
            category, _ = Category.objects.get_or_create(name=category_name.strip())
            validated_data["category"] = category
        return super().update(instance, validated_data)


class BookListSerializer(serializers.ModelSerializer):
    is_available = serializers.BooleanField(read_only=True)
    category = CategorySerializer(read_only=True)
    available_copies = serializers.SerializerMethodField()
    pending_requests_count = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            "id",
            "title",
            "author",
            "category",
            "cover_image",
            "number_of_copies",
            "available_copies",
            "availability",
            "is_available",
            "pending_requests_count",
        ]

    def get_available_copies(self, obj):
        active_loans = obj.loans.filter(returned_at__isnull=True).count()
        return max(0, obj.number_of_copies - active_loans)

    def get_pending_requests_count(self, obj):
        return obj.borrow_requests.filter(status="pending").count()
