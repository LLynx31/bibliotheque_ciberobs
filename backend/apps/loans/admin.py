from django.contrib import admin
from .models import BorrowRequest, Loan


@admin.register(BorrowRequest)
class BorrowRequestAdmin(admin.ModelAdmin):
    list_display = ["employee", "book", "status", "requested_at", "reviewed_by"]
    list_filter = ["status"]
    search_fields = ["employee__username", "book__title"]


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ["employee", "book", "borrowed_at", "due_date", "returned_at"]
    list_filter = ["returned_at"]
    search_fields = ["employee__username", "book__title"]
