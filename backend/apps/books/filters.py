from django_filters import rest_framework as filters
from .models import Book


class BookFilter(filters.FilterSet):
    title = filters.CharFilter(lookup_expr="icontains")
    author = filters.CharFilter(lookup_expr="icontains")
    category = filters.NumberFilter(field_name="category__id")
    category_name = filters.CharFilter(field_name="category__name", lookup_expr="iexact")
    year_from = filters.NumberFilter(field_name="year_published", lookup_expr="gte")
    year_to = filters.NumberFilter(field_name="year_published", lookup_expr="lte")

    class Meta:
        model = Book
        fields = ["availability", "category", "author"]
