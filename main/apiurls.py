from django.conf.urls import url

import apiviews

urlpatterns = [
  url(r'^problemsets$', apiviews.api_problem_set),
  url(r'^problemset(/(?P<_id>\d+))?$', apiviews.api_problem_set),
  url(r'^students$', apiviews.api_student),
  url(r'^student(/(?P<_id>\d+))?$', apiviews.api_student),
]