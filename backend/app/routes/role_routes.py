from fastapi import APIRouter

router = APIRouter(prefix="/roles", tags=["Roles"])

@router.get("/{department}")
def get_roles(department: str):

    roles = {
        "Development": [
            "Frontend Developer",
            "Backend Developer",
            "Full Stack Developer",
            "DevOps Engineer"
        ],
        "Marketing": [
            "SEO",
            "Social Media",
            "Content Marketing"
        ],
        "Design": [
            "UI Designer",
            "UX Designer",
            "Product Designer"
        ]
    }

    return {
        "roles": roles.get(department, [])
    }