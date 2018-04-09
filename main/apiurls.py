from django.conf.urls import url

import apiviews

urlpatterns = [
  url(r'^problemsets$', apiviews.api_problem_set),
  url(r'^problemset(/(?P<_id>\d+))?$', apiviews.api_problem_set),
  url(r'^students$', apiviews.api_student),
  url(r'^student(/(?P<_id>\d+))?$', apiviews.api_student),
  url(r'^scorings/(?P<ps_id>\d+)$', apiviews.api_get_scorings),
  url(r'^regroup/(?P<ps_id>\d+)$', apiviews.api_regroup),
  url(r'^degroup/(?P<grp_id>\d+)$', apiviews.api_degroup),
  url(r'^score/group/(?P<grp_id>\d+)$', apiviews.api_update_group_scoring),
  url(r'^score/problemset/(?P<ps_id>\d+)/student/(?P<st_id>\d+)$', apiviews.api_update_student_scoring),
]