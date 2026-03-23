from django.urls import path
from . import views

urlpatterns = [
    path("stats/", views.stats, name="dashboard-stats"),
    path("most-borrowed/", views.most_borrowed, name="dashboard-most-borrowed"),
    path("active-borrowers/", views.active_borrowers, name="dashboard-active-borrowers"),
    path("recent-activity/", views.recent_activity, name="dashboard-recent-activity"),
]
