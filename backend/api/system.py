from fastapi import APIRouter

from systems.system_scan import run_system_scan


router = APIRouter(prefix="/system", tags=["system"])


@router.get("/scan")
def system_scan():
    return run_system_scan()