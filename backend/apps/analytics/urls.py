from django.urls import path
from apps.analytics import views

urlpatterns = [
    path('dashboard/', views.DashboardSummaryView.as_view(), name='analytics-dashboard'),
    path('deal-scores/', views.DealScoreListView.as_view(), name='deal-score-list'),
    path('deal-scores/<str:deal_id>/', views.DealScoreDetailView.as_view(), name='deal-score-detail'),
    path('deal-scores/trigger/', views.TriggerScoringView.as_view(), name='deal-score-trigger'),
    path('kpi/', views.KPISnapshotListView.as_view(), name='kpi-list'),
    path('insights/', views.AIInsightListView.as_view(), name='insight-list'),
    path('insights/<str:pk>/dismiss/', views.DismissInsightView.as_view(), name='insight-dismiss'),
    path('claude/', views.ClaudeAnalysisView.as_view(), name='claude-analysis'),
    path('forecast/', views.ForecastView.as_view(), name='forecast'),
]
