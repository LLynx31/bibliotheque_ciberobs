from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import IsAdminOrManager
from apps.loans.serializers import LoanSerializer
from .controllers import DashboardController


@api_view(["GET"])
@permission_classes([IsAdminOrManager])
def stats(request):
    return Response(DashboardController.get_stats())


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def most_borrowed(request):
    return Response(DashboardController.get_most_borrowed())


@api_view(["GET"])
@permission_classes([IsAdminOrManager])
def active_borrowers(request):
    return Response(DashboardController.get_active_borrowers())


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recent_activity(request):
    loans = DashboardController.get_recent_activity()
    serializer = LoanSerializer(loans, many=True)
    return Response(serializer.data)
