# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.http import HttpResponse, HttpResponseNotAllowed, HttpResponseBadRequest
from django.shortcuts import render

import json

# Create your views here.

def index(request):
  return render(request, "index.html")

def problem_set(request, _id=None):
  return render(request, "problem_set.html", {"id": _id})
