"""Career role recommendation.

Hybrid, rule-based scoring. This is deterministic data logic, NOT machine
learning. Scores represent profile compatibility, not probability of career
success (per PLAN.md section 18).
"""

from __future__ import annotations

from app.schemas.career import CareerRecommendationRequest, RoleRecommendation

ROLE_DEFINITIONS: list[dict] = [
    {
        "role": "Full-Stack Developer",
        "skill_keywords": ["javascript", "typescript", "react", "node", "html", "css", "sql"],
        "project_keywords": ["react", "node", "web", "frontend", "backend", "full stack"],
        "cert_keywords": ["web", "frontend", "full stack", "javascript"],
        "interests": ["web development", "full stack", "frontend", "backend"],
        "base_score": 40,
        "academic_subjects": ["DBMS", "Computer Networks", "Software Engineering"],
    },
    {
        "role": "Backend Developer",
        "skill_keywords": ["node", "python", "java", "sql", "postgresql", "rest", "api", "go", "spring"],
        "project_keywords": ["backend", "api", "database", "server", "rest", "microservices"],
        "cert_keywords": ["backend", "api", "database", "cloud"],
        "interests": ["backend", "api", "server", "database"],
        "base_score": 35,
        "academic_subjects": ["DBMS", "Operating Systems", "Computer Networks"],
    },
    {
        "role": "Frontend Developer",
        "skill_keywords": ["javascript", "typescript", "react", "html", "css", "ui", "ux", "vue", "figma"],
        "project_keywords": ["frontend", "react", "web", "ui", "javascript"],
        "cert_keywords": ["frontend", "web", "javascript", "ui", "ux"],
        "interests": ["frontend", "web design", "ui", "ux", "interface"],
        "base_score": 35,
        "academic_subjects": ["Software Engineering", "Human Computer Interaction"],
    },
    {
        "role": "Data Scientist",
        "skill_keywords": ["python", "pandas", "numpy", "sql", "statistics", "matplotlib", "scikit-learn", "r"],
        "project_keywords": ["data", "analysis", "analytics", "ml", "python", "prediction"],
        "cert_keywords": ["data", "analytics", "machine learning", "statistics"],
        "interests": ["data", "analytics", "statistics", "data science"],
        "base_score": 35,
        "academic_subjects": ["Mathematics", "Machine Learning", "Statistics"],
    },
    {
        "role": "Machine Learning Engineer",
        "skill_keywords": ["python", "tensorflow", "pytorch", "scikit-learn", "machine learning", "deep learning", "numpy", "pandas"],
        "project_keywords": ["ml", "machine learning", "model", "neural", "prediction", "deep learning"],
        "cert_keywords": ["machine learning", "deep learning", "ai", "tensorflow"],
        "interests": ["machine learning", "deep learning", "ai", "artificial intelligence"],
        "base_score": 35,
        "academic_subjects": ["Machine Learning", "Mathematics", "Data Structures & Algorithms"],
    },
    {
        "role": "Cybersecurity Analyst",
        "skill_keywords": ["security", "networking", "linux", "python", "cryptography", "penetration", "firewall"],
        "project_keywords": ["security", "encryption", "authentication", "penetration", "vulnerability"],
        "cert_keywords": ["security", "cybersecurity", "certified", "ciso", "network security"],
        "interests": ["security", "cybersecurity", "hacking", "network security"],
        "base_score": 30,
        "academic_subjects": ["Computer Networks", "Cryptography", "Operating Systems"],
    },
    {
        "role": "DevOps Engineer",
        "skill_keywords": ["docker", "kubernetes", "aws", "linux", "ci/cd", "git", "terraform", "jenkins"],
        "project_keywords": ["docker", "deployment", "ci/cd", "devops", "automation", "kubernetes"],
        "cert_keywords": ["devops", "aws", "docker", "kubernetes", "cloud"],
        "interests": ["devops", "cloud", "deployment", "automation", "infrastructure"],
        "base_score": 30,
        "academic_subjects": ["Operating Systems", "Computer Networks", "Software Engineering"],
    },
    {
        "role": "Cloud Engineer",
        "skill_keywords": ["aws", "azure", "gcp", "cloud", "linux", "docker", "kubernetes", "networking"],
        "project_keywords": ["cloud", "aws", "azure", "deployment", "scalability"],
        "cert_keywords": ["aws", "azure", "gcp", "cloud", "architect"],
        "interests": ["cloud", "aws", "azure", "infrastructure", "distributed systems"],
        "base_score": 28,
        "academic_subjects": ["Computer Networks", "Operating Systems", "Cloud Computing"],
    },
    {
        "role": "UI/UX Designer",
        "skill_keywords": ["figma", "design", "ui", "ux", "wireframe", "prototype", "adobe", "sketch"],
        "project_keywords": ["design", "ui", "ux", "prototype", "wireframe", "interaction"],
        "cert_keywords": ["ux", "ui", "design", "figma"],
        "interests": ["design", "ui", "ux", "user experience", "product design"],
        "base_score": 28,
        "academic_subjects": ["Human Computer Interaction", "Software Engineering"],
    },
]


def _proficiency_weight(proficiency: str) -> float:
    return {
        "Beginner": 0.5,
        "Intermediate": 0.8,
        "Advanced": 1.0,
        "Expert": 1.2,
    }.get(proficiency, 0.8)


def recommend_careers(payload: CareerRecommendationRequest) -> list[RoleRecommendation]:
    student_skills = [s.name.lower() for s in payload.skills]
    project_techs: list[str] = []
    for p in payload.projects:
        project_techs.extend(t.lower() for t in p.technologies)
    cert_names = [c.name.lower() for c in payload.certifications]
    interests = [i.lower() for i in payload.interests]
    subject_names = [s.name.lower() for s in payload.subject_performance]

    results: list[RoleRecommendation] = []

    for definition in ROLE_DEFINITIONS:
        score = definition["base_score"]
        reasons: list[str] = []

        # Skill matching
        skill_hits = 0
        matched_skill_names: list[str] = []
        for keyword in definition["skill_keywords"]:
            for skill in student_skills:
                if keyword in skill:
                    skill_hits += 1
                    matched_skill_names.append(skill)
                    break
        if skill_hits:
            best_proficiency = max(
                (
                    s.proficiency
                    for s in payload.skills
                    if s.name.lower() in matched_skill_names
                ),
                key=lambda p: _proficiency_weight(p),
                default="Intermediate",
            )
            weight = _proficiency_weight(best_proficiency)
            score += min(skill_hits, 6) * 4 * weight
            reasons.append("Skill match")

        # Project technology matching
        project_hits = sum(
            1 for keyword in definition["project_keywords"] if keyword in project_techs
        )
        if project_hits:
            score += min(project_hits, 4) * 3
            reasons.append("Project experience")

        # Certification matching
        cert_hits = sum(
            1 for keyword in definition["cert_keywords"] if keyword in cert_names
        )
        if cert_hits:
            score += min(cert_hits, 3) * 2.5
            reasons.append("Certification match")

        # Interest matching
        interest_hits = sum(
            1 for keyword in definition["interests"] if keyword in interests
        )
        if interest_hits:
            score += min(interest_hits, 3) * 2
            reasons.append("Interest match")

        # Academic performance bonus
        if payload.cgpa is not None:
            if payload.cgpa >= 8.5:
                score += 6
                reasons.append("Academic performance")
            elif payload.cgpa >= 7.5:
                score += 4
                reasons.append("Academic performance")
            elif payload.cgpa >= 6.5:
                score += 2
                reasons.append("Academic performance")

        # Relevant subject performance
        if subject_names:
            subject_hits = sum(
                1
                for subject in definition["academic_subjects"]
                if subject.lower() in subject_names
            )
            if subject_hits:
                score += min(subject_hits, 3) * 1.5

        score = max(0, min(100, round(score)))

        if score >= 40 and reasons:
            results.append(
                RoleRecommendation(role=definition["role"], score=score, matched_factors=reasons)
            )

    results.sort(key=lambda r: r.score, reverse=True)
    return results[:3]