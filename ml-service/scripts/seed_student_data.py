"""Seed a student's transcript into Supabase.

Run from the ml-service directory:
    python -m scripts.seed_student_data

Replaces the subjects catalog with the exact course list below and inserts
semesters + subject results for one student. Uses the server-side Supabase
client (service role) so RLS is bypassed.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.utils.supabase import get_client  # noqa: E402

STUDENT_ID = "JEC24CS060"

GRADE_POINT: dict[str, float | None] = {
    "S": None,
    "A+": 9.0,
    "A": 8.0,
    "B+": 7.0,
    "B": 6.0,
    "C+": 5.0,
    "C": 4.0,
    "D": 3.0,
    "E": 2.0,
    "PASS": None,
}

# (code, name, credits, department)
SUBJECTS: list[tuple[str, str, int, str]] = [
    ("UCEST105", "ALGORITHMIC THINKING WITH PYTHON", 4, "Computer Science"),
    ("GXESL106", "BASIC ELECTRICAL AND ELECTRONICS ENGINEERING WORKSHOP", 1, "Computer Science"),
    ("GXCYT122", "CHEMISTRY FOR INFORMATION SCIENCE", 4, "Chemistry"),
    ("GMEST103", "ENGINEERING GRAPHICS AND COMPUTER AIDED DRAWING", 3, "Computer Science"),
    ("GXEST104", "INTRODUCTION TO ELECTRICAL & ELECTRONICS ENGINEERING", 4, "Computer Science"),
    ("UCHUT128", "LIFE SKILLS AND PROFESSIONAL COMMUNICATION", 1, "Computer Science"),
    ("GAMAT101", "MATHEMATICS FOR INFORMATION SCIENCE-1", 3, "Mathematics"),
    ("PCCST205", "DISCRETE MATHEMATICS", 4, "Computer Science"),
    ("UCEST206", "ENGINEERING ENTREPRENEURSHIP & IPR", 3, "Computer Science"),
    ("GXEST203", "FOUNDATIONS OF COMPUTING: FROM HARDWARE ESSENTIALS TO WEB DESIGN", 3, "Computer Science"),
    ("UCHWT127", "HEALTH AND WELLNESS", 1, "Computer Science"),
    ("GXESL208", "IT WORKSHOP", 1, "Computer Science"),
    ("GAMAT201", "MATHEMATICS FOR INFORMATION SCIENCE - 2", 3, "Mathematics"),
    ("GAPHT121", "PHYSICS FOR INFORMATION SCIENCE", 4, "Physics"),
    ("GXEST204", "PROGRAMMING IN C", 4, "Computer Science"),
    ("UCSEM129", "SKILL ENHANCEMENT COURSE:DIGITAL 101", 1, "Computer Science"),
    ("PCCST303", "DATA STRUCTURES AND ALGORITHMS", 4, "Computer Science"),
    ("PCCSL307", "DATA STRUCTURES LAB", 2, "Computer Science"),
    ("GAEST305", "DIGITAL ELECTRONICS & LOGIC DESIGN", 4, "Computer Science"),
    ("PCCSL308", "DIGITAL LAB", 2, "Computer Science"),
    ("UCHUT346", "ECONOMICS FOR ENGINEERS", 2, "Computer Science"),
    ("GAMAT301", "MATHEMATICS FOR INFORMATION SCIENCE-3", 3, "Mathematics"),
    ("PBCST304", "OBJECT ORIENTED PROGRAMMING", 4, "Computer Science"),
    ("PCCST302", "THEORY OF COMPUTATION", 4, "Computer Science"),
    ("PBCST404", "COMPUTER ORGANIZATION AND ARCHITECTURE", 4, "Computer Science"),
    ("PCCST402", "DATABASE MANAGEMENT SYSTEMS", 4, "Computer Science"),
    ("PCCSL408", "DBMS LAB", 2, "Computer Science"),
    ("UCHUT347", "ENGINEERING ETHICS AND SUSTAINABLE DEVELOPMENT", 2, "Computer Science"),
    ("GAMAT401", "MATHEMATICS FOR INFORMATION SCIENCE -IV", 3, "Mathematics"),
    ("PCCST403", "OPERATING SYSTEMS", 4, "Computer Science"),
    ("PCCSL407", "OPERATING SYSTEMS LAB", 2, "Computer Science"),
    ("PECST411", "SOFTWARE ENGINEERING", 3, "Computer Science"),
]

# (semester_number, sgpa, cgpa, academic_year, [(subject_code, grade), ...])
SEMESTERS: list[tuple[int, float, float, str, list[tuple[str, str]]]] = [
    (1, 9.05, 9.05, "2024-2025", [
        ("UCEST105", "A+"),
        ("GXESL106", "S"),
        ("GXCYT122", "B+"),
        ("GMEST103", "A+"),
        ("GXEST104", "S"),
        ("UCHUT128", "PASS"),
        ("GAMAT101", "A+"),
    ]),
    (2, 8.68, 8.85, "2024-2025", [
        ("PCCST205", "B"),
        ("UCEST206", "S"),
        ("GXEST203", "S"),
        ("UCHWT127", "PASS"),
        ("GXESL208", "S"),
        ("GAMAT201", "A+"),
        ("GAPHT121", "C+"),
        ("GXEST204", "A+"),
        ("UCSEM129", "PASS"),
    ]),
    (3, 8.58, 8.75, "2025-2026", [
        ("PCCST303", "B+"),
        ("PCCSL307", "A"),
        ("GAEST305", "A+"),
        ("PCCSL308", "S"),
        ("UCHUT346", "B+"),
        ("GAMAT301", "C"),
        ("PBCST304", "S"),
        ("PCCST302", "A"),
    ]),
    (4, 8.92, 8.79, "2025-2026", [
        ("PBCST404", "B+"),
        ("PCCST402", "S"),
        ("PCCSL408", "S"),
        ("UCHUT347", "A"),
        ("GAMAT401", "A"),
        ("PCCST403", "A"),
        ("PCCSL407", "S"),
        ("PECST411", "A"),
    ]),
]


def main() -> None:
    client = get_client()

    students = client.table("students").select("id").eq("student_id", STUDENT_ID).execute().data
    if not students:
        raise SystemExit(f"Student {STUDENT_ID} not found.")
    student_uuid = students[0]["id"]

    # Clear existing subjects and the student's semesters (results cascade).
    client.table("subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    client.table("semesters").delete().eq("student_id", student_uuid).execute()

    # Rebuild the subjects catalog.
    inserted = client.table("subjects").insert(
        [
            {"code": code, "name": name, "credits": credits, "department": department}
            for code, name, credits, department in SUBJECTS
        ]
    ).execute().data
    subject_id_by_code = {row["code"]: row["id"] for row in inserted}

    # Insert semesters and results.
    result_count = 0
    for number, sgpa, cgpa, year, courses in SEMESTERS:
        semester = client.table("semesters").insert({
            "student_id": student_uuid,
            "semester_number": number,
            "sgpa": sgpa,
            "cgpa": cgpa,
            "academic_year": year,
        }).execute().data[0]
        rows = [
            {
                "student_id": student_uuid,
                "semester_id": semester["id"],
                "subject_id": subject_id_by_code[code],
                "marks": None,
                "grade": grade,
                "grade_point": GRADE_POINT[grade],
            }
            for code, grade in courses
        ]
        inserted_results = client.table("subject_results").insert(rows).execute().data
        result_count += len(inserted_results)

    print(f"Seeded {len(inserted)} subjects, {len(SEMESTERS)} semesters, {result_count} results for {STUDENT_ID}.")


if __name__ == "__main__":
    main()