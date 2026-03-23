from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == "admin"


class IsAdminOrReadOnly(BasePermission):
    """Admin or book_manager can write, everyone else can read."""
    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_authenticated and request.user.can_manage_books


class CanManageBooks(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.can_manage_books


class CanManageRequests(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.can_manage_requests


class IsAdminOrManager(BasePermission):
    """Admin, book_manager, or request_manager."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("admin", "book_manager", "request_manager")
        )
