from django.conf.urls import url, include

import views
import apiurls

urlpatterns = [
  url(r'^$', views.index),
  url(r'^ps/(?P<_id>\d+)$', views.problem_set),
  url(r'^api/', include(apiurls.urlpatterns))
]