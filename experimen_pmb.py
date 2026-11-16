#!/usr/bin/env python3
"""
TP6 - Eksperimen Model dan Justifikasi AI Proyek Kelompok
Tema: AI Asisten Pendaftaran Mahasiswa Baru (PMB) - Kelompok 1
Catatan: 100% menggunakan data sintetis tanpa API key/secrets.
"""
import json
import re
import time
import platform
import sys
import numpy as np
import pandas as pd
import sklearn
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score, f1_score
from sklearn.metrics.pairwise import cosine_similarity

def mask_pii(text: str) -> str:
    text = re.sub(r"\b\d{16}\b", "[NIK_MASKED]", text)
    text = re.sub(r"\b(\+62|62|0)8[1-9][0-9]{6,10}\b", "[PHONE_MASKED]", text)
    text = re.sub(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", "[EMAIL_MASKED]", text)
    return text

def baseline_keyword_predict(text: str) -> str:
    t = text.lower()
    rules = [
        ("Beasiswa", ["beasiswa", "kip", "hafalan", "kurang mampu", "potongan spp", "ikatan dinas", "prestasi juara"]),
        ("Biaya_dan_UKT", ["biaya", "ukt", "spp", "bayar", "pembayaran", "cicil", "virtual account", "uang pangkal", "tarif", "denda", "slip gaji"]),
        ("Syarat_Berkas", ["berkas", "dokumen", "scan", "pdf", "foto", "ijazah", "skl", "ktp", "kartu keluarga", "legalisir", "buta warna", "fotokopi"]),
        ("Jadwal_dan_Alur", ["kapan", "tanggal", "jadwal", "batas akhir", "alur", "urutan", "langkah", "cetak", "finalisasi", "jam berapa", "pkkmb", "lapor diri"]),
        ("Jalur_Seleksi", ["jalur", "seleksi", "rapor", "utbk", "mandiri", "undangan", "alih jenjang", "pindahan", "wawancara", "portofolio", "gelombang"])
    ]
    scores = {label: sum(1 for kw in kws if kw in t) for label, kws in rules}
    best_label = max(scores, key=scores.get)
    return "Jalur_Seleksi" if scores[best_label] == 0 else best_label

def main():
    df = pd.read_csv("dataset_sintetis_pmb_tp6.csv")
    with open("kb_faq_pmb_sintetis.json", "r", encoding="utf-8") as f:
        kb_faq = json.load(f)

    X_train, X_test, y_train, y_test = train_test_split(
        df["pertanyaan"], df["intent"], test_size=0.25, random_state=42, stratify=df["intent"]
    )

    y_pred_base = [baseline_keyword_predict(q) for q in X_test]
    print(f"Baseline-0 Accuracy: {accuracy_score(y_test, y_pred_base):.4f} | Macro-F1: {f1_score(y_test, y_pred_base, average='macro'):.4f}")

    vec_hybrid = FeatureUnion([
        ("word", TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)),
        ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True))
    ])
    clf = LogisticRegression(C=3.0, max_iter=1000, random_state=42)
    clf.fit(vec_hybrid.fit_transform(X_train), y_train)

    y_pred = clf.predict(vec_hybrid.transform(X_test))
    print(f"Model-2 Accuracy   : {accuracy_score(y_test, y_pred):.4f} | Macro-F1: {f1_score(y_test, y_pred, average='macro'):.4f}")
    print("\nClassification Report:\n", classification_report(y_test, y_pred, digits=4))

if __name__ == "__main__":
    main()
