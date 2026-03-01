from django.urls import path
from apps.comptabilite import views

urlpatterns = [
    # Chart of accounts
    path('accounts/', views.AccountListCreateView.as_view(), name='account-list'),
    path('accounts/<str:pk>/', views.AccountDetailView.as_view(), name='account-detail'),
    # Journal entries
    path('journal/', views.JournalEntryListCreateView.as_view(), name='journal-list'),
    path('journal/<str:pk>/', views.JournalEntryDetailView.as_view(), name='journal-detail'),
    path('journal/<str:pk>/post/', views.PostJournalEntryView.as_view(), name='journal-post'),
    # Transactions
    path('transactions/', views.TransactionListView.as_view(), name='transaction-list'),
    # Reports
    path('reports/balance-sheet/', views.BalanceSheetView.as_view(), name='balance-sheet'),
    path('reports/profit-loss/', views.ProfitLossView.as_view(), name='profit-loss'),
]
