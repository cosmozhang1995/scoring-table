# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.http import HttpResponse, HttpResponseNotAllowed, HttpResponseBadRequest, HttpResponseNotFound
from django.shortcuts import render

import json

from models import ProblemSet, Student, Group, StudentGroup, ScoringRecord

def JsonResponse(obj):
  return HttpResponse(json.dumps(obj), content_type="application/json")

class methods:
  GET="GET"
  POST="POST"
  PUT="PUT"
  DELETE="DELETE"

# def api_function(allowed_methods=None, required_url_params=[]):
#   if not isinstance(allowed_methods, list) and not isinstance(allowed_methods, tuple):
#     allowed_methods = [allowed_methods]
#   def decorator(fn):
#     def wrapper(request, **kwargs):
#       if not allowed_methods is None:
#         if not request.method in allowed_methods:
#           return HttpResponseNotAllowed(allowed_methods)
#       for param_name in required_url_params:
#         if not param_name in kwargs:
#           return HttpResponseBadRequest()
#       return apply(fn, (request,), kwargs)
#     return wrapper
#   return decorator

# @api_function(methods.GET)
# def api_problem_set_query_all(request):
#   resp = [record.json() for record in ProblemSet.objects.all()]
#   return JsonResponse(resp)

# @api_function(methods.POST)
# def api_problem_set_qeury_or_create(request):
#   data = json.loads(request.body)
#   ps = ProblemSet.objects.create(name=data["name"], problems=data["problems"], method=data["method"])
#   resp = ps.json()
#   return JsonResponse(resp)

# @api_function([methods.GET, methods.PUT, methods.DELETE], ['ps_id'])
# def api_problem_set_update_or_delete(request, ps_id=None):
#   data = json.loads(request.body)
#   ps = ProblemSet.objects.get(id=ps_id)
#   if request.method == methods.PUT:
#     for k in data:
#       if k == "name": ps.name = data[k]
#       if k == "problems": ps.problems = data[k]
#       if k == "method": ps.method = data[k]
#     ps.save()
#     return HttpResponse("ok")
#   elif request.method == methods.DELETE:
#     ps.delete()
#     return HttpResponse("ok")

def parse_request_data(request):
  data = None
  try:
    data = json.loads(request.body)
  except TypeError, e:
    pass
  except ValueError, e:
    pass
  return data

def get_instant(model, _id=None):
  if _id is None:
    return None
  else:
    return model.objects.get(id=int(_id))

def restful_api(model):
  def api_fn(request, _id=None):
    ins = get_instant(model, _id)
    data = parse_request_data(request)
    if not _id is None and ins is None:
      return HttpResponseNotFound
    if request.method == methods.GET:
      if _id is None:
        resp = [record.json() for record in model.objects.all()]
        return JsonResponse(resp)
      else:
        resp = ins.json()
        return JsonResponse(resp)
    elif request.method == methods.POST:
      ins = apply(model.objects.create, (), data)
      resp = ins.json()
      return JsonResponse(resp)
    if request.method == methods.PUT and not ins is None and not data is None:
      for k in data:
        setattr(ins, k, data[k])
      ins.save()
      return HttpResponse("ok")
    elif request.method == methods.DELETE and not ins is None:
      ins.delete()
      return HttpResponse("ok")
    else:
      return HttpResponseBadRequest()
  return api_fn

api_problem_set = restful_api(ProblemSet)
api_student = restful_api(Student)

def api_get_scorings(request, ps_id):
  ps_id = int(ps_id)
  ps = ProblemSet.objects.get(id=ps_id)
  students = list(Student.objects.all())
  groups = list(Group.objects.filter(ps=ps))
  scores = []
  for grp in groups:
    sts = map(lambda stgrp: stgrp.student, StudentGroup.objects.filter(group=grp))
    for st in sts:
      students = filter(lambda s: s.id != st.id, students)
    scr = ScoringRecord.objects.find(group=grp)
    scores.append({
      "gid": grp.id,
      "students": map(lambda st: st.json(), sts),
      "scoring": scr.scores
    })
  for st in students:
    scores.append({
      "gid": None,
      "students": map(lambda st: st.json(), sts),
      "scoring": None
    })
  return JsonResponse(scores)

def api_regroup(request, ps_id):
  ps_id = int(ps_id)
  ps = ProblemSet.objects.get(id=ps_id)
  data = parse_request_data(request)
  students = map(lambda sid: Student.objects.get(id=sid), data['sids'])
  for student in students:
    oldstgrp = filter(lambda stgrp: stgrp.group.ps.id == ps_id, StudentGroup.objects.filter(student=student))
    oldstgrp = oldstgrp[0] if len(oldstgrp) > 0 else None
    if not oldstgrp is None:
      oldgrp = oldstgrp.group
      if len(StudentGroup.objects.filter(group=oldgrp)) < 2:
        oldgrp.delete()
      oldstgrp.delete()
  grp = Group.objects.create(ps=ps)
  for student in students:
    stgrp = StudentGroup.objects.create(group=grp, student=student)
  return JsonResponse({
    "gid": grp.id,
    "students": map(lambda st: st.json(), students),
    "scoring": None
  })

def api_update_group_scoring(request, grp_id):
  grp_id = int(grp_id)
  grp = Group.objects.get(id=grp_id)
  scr = ScoringRecord.objects.get(group=grp)
  if scr is None:
    scr = ScoringRecord.objects.create(group=grp)
  data = parse_request_data(request)
  scr.scores = data['scoring']
  scr.save()
  return HttpResponse("ok")

def api_update_student_scoring(request, st_id, ps_id):
  st_id = int(st_id)
  st = Student.objects.get(id=st_id)
  ps_id = int(ps_id)
  ps = ProblemSet.objects.get(id=ps_id)
  data = parse_request_data(request)
  stgrp = filter(lambda stgrp: stgrp.group.ps.id == ps_id, StudentGroup.objects.filter(student=st))
  stgrp = stgrp[0] if len(stgrp) > 0 else None
  if stgrp is None:
    grp = Group.objects.create(ps=ps)
    stgrp = StudentGroup.objects.create(group=grp, student=st)
  else:
    grp = stgrp.group
  scr = ScoringRecord.objects.get(group=grp)
  if scr is None:
    scr = ScoringRecord.objects.create(group=grp)
  data = parse_request_data(request)
  scr.scores = data['scoring']
  scr.save()
