from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import os

class ReputationProvider(ABC):
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass

    @abstractmethod
    def check_number(self, phone_number: str) -> Optional[Dict[str, Any]]:
        pass

class TruecallerProvider(ReputationProvider):
    def name(self) -> str:
        return "TruecallerProvider"

    def is_available(self) -> bool:
        return bool(os.getenv("TRUECALLER_API_KEY"))

    def check_number(self, phone_number: str) -> Optional[Dict[str, Any]]:
        if not self.is_available():
            return None
        # Official developer API query integration
        return None

class LocalSpamDatabaseProvider(ReputationProvider):
    def __init__(self):
        self._spam_records = {
            "+18005550199": {"score": 98, "category": "IRS Tax Impersonation", "reports": 420},
            "+919876543210": {"score": 94, "category": "Electricity Bill Disconnection Fraud", "reports": 189},
            "+918001234567": {"score": 97, "category": "Fake Lottery / Prize Winner", "reports": 560},
        }

    def name(self) -> str:
        return "LocalSpamDatabaseProvider"

    def is_available(self) -> bool:
        return True

    def check_number(self, phone_number: str) -> Optional[Dict[str, Any]]:
        clean = "".join(c for c in phone_number if c.isdigit() or c == '+')
        if clean in self._spam_records:
            item = self._spam_records[clean]
            return {
                "score": item["score"],
                "category": item["category"],
                "is_spam": item["score"] >= 80,
                "reports_count": item["reports"],
                "provider": self.name(),
            }
        return None

class UserReportProvider(ReputationProvider):
    def __init__(self):
        self._user_reports = {
            "+15557890123": {"score": 85, "category": "Robocall Auto Warranty", "reports": 48},
        }

    def name(self) -> str:
        return "UserReportProvider"

    def is_available(self) -> bool:
        return True

    def check_number(self, phone_number: str) -> Optional[Dict[str, Any]]:
        clean = "".join(c for c in phone_number if c.isdigit() or c == '+')
        if clean in self._user_reports:
            item = self._user_reports[clean]
            return {
                "score": item["score"],
                "category": item["category"],
                "is_spam": item["score"] >= 80,
                "reports_count": item["reports"],
                "provider": self.name(),
            }
        return None

class ReputationService:
    def __init__(self):
        self.providers = [
            LocalSpamDatabaseProvider(),
            UserReportProvider(),
            TruecallerProvider(),
        ]

    def evaluate(self, phone_number: str) -> Dict[str, Any]:
        for provider in self.providers:
            if provider.is_available():
                res = provider.check_number(phone_number)
                if res and res.get("is_spam"):
                    return res

        return {
            "score": 15,
            "category": "Unknown / Unclassified",
            "is_spam": False,
            "reports_count": 0,
            "provider": "AggregatedMultiProvider",
        }

reputation_service = ReputationService()
