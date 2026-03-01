from django.urls import path
from apps.instagram import views

urlpatterns = [
    path('webhook/', views.InstagramWebhookView.as_view(), name='ig-webhook'),
    path('inbox/', views.DMInboxView.as_view(), name='ig-inbox'),
    path('posts/', views.PostListView.as_view(), name='ig-posts'),
    path('posts/sync/', views.SyncPostsView.as_view(), name='ig-sync'),
    path('posts/<str:post_id>/comments/', views.CommentListView.as_view(), name='ig-comments'),
    path('comments/<str:comment_id>/reply/', views.ReplyCommentView.as_view(), name='ig-reply'),
]
