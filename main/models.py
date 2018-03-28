# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models

# Create your models here.

class CommonModel(models.Model):
  createtime = models.DateTimeField(auto_now_add=True)
  updatetime = models.DateTimeField(auto_now=True)
  class Meta:
    abstract = True
  def json(self):
    import json
    jsondict = {}
    for field in self._meta.fields:
      fieldname = field.name
      if fieldname in ["createtime", "updatetime"]:
        continue
      jsondict[fieldname] = getattr(self, fieldname)
    return jsondict

class ProblemSet(CommonModel):
  name = models.CharField(max_length=100)
  problems = models.CharField(max_length=1024)
  method = models.CharField(max_length=2048)

class Student(CommonModel):
  no = models.CharField(max_length=50)
  name = models.CharField(max_length=100)

class Group(CommonModel):
  ps = models.ForeignKey(ProblemSet)

class StudentGroup(models.Model):
  group = models.ForeignKey(Group)
  student = models.ForeignKey(Student)

class ScoringRecord(CommonModel):
  group = models.ForeignKey(Group)
  scores = models.CharField(max_length=2048)
