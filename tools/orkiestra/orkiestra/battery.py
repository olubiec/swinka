"""Battery monitoring module for Orkiestra."""
from __future__ import annotations

import ctypes
import logging
import os
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)


class SYSTEM_POWER_STATUS(ctypes.Structure):
    _fields_ = [
        ("ACLineStatus", ctypes.c_byte),
        ("BatteryFlag", ctypes.c_byte),
        ("BatteryLifePercent", ctypes.c_ubyte),
        ("SystemStatusFlag", ctypes.c_byte),
        ("BatteryLifeTime", ctypes.c_ulong),
        ("BatteryFullLifeTime", ctypes.c_ulong),
    ]


@dataclass
class BatteryStatus:
    ac_line_status: int
    battery_flag: int
    percent: int
    lifetime_seconds: int

    @property
    def is_on_battery(self) -> bool:
        return self.ac_line_status == 0

    @property
    def is_plugged_in(self) -> bool:
        return self.ac_line_status == 1

    def is_low(self, threshold_percent: int = 20) -> bool:
        if self.percent == 255:
            return False
        if self.is_on_battery and self.percent <= threshold_percent:
            return True
        if self.percent <= 10:
            return True
        if self.battery_flag & 4:
            return True
        return False

    def summary(self) -> str:
        ac_desc = "AC" if self.is_plugged_in else ("Bateria" if self.is_on_battery else "Nieznane")
        pct_str = f"{self.percent}%" if self.percent != 255 else "nieznany"
        return f"{pct_str} ({ac_desc})"


def get_battery_status() -> BatteryStatus:
    if os.name == "nt":
        try:
            status = SYSTEM_POWER_STATUS()
            if ctypes.windll.kernel32.GetSystemPowerStatus(ctypes.byref(status)):
                return BatteryStatus(
                    ac_line_status=status.ACLineStatus,
                    battery_flag=status.BatteryFlag,
                    percent=status.BatteryLifePercent,
                    lifetime_seconds=status.BatteryLifeTime,
                )
        except Exception as exc:
            logger.debug("GetSystemPowerStatus error: %s", exc)
    else:
        try:
            supply = Path("/sys/class/power_supply")
            for bat in supply.glob("BAT*"):
                cap = (bat / "capacity").read_text().strip()
                stat = (bat / "status").read_text().strip().lower()
                is_ac = stat in ("charging", "full")
                return BatteryStatus(
                    ac_line_status=1 if is_ac else 0,
                    battery_flag=1,
                    percent=int(cap),
                    lifetime_seconds=0,
                )
        except Exception:
            pass
    return BatteryStatus(ac_line_status=1, battery_flag=1, percent=100, lifetime_seconds=0)
