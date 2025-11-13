# app/inventario.py
from flask import Flask, render_template, request, redirect, url_for, jsonify
from app import app

@app.route('/')
def inicio():
    return render_template('inicio.html')