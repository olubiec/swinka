from __future__ import annotations


class OrkiestraError(Exception):
    """Base error for orkiestra."""


class PlanError(OrkiestraError):
    """Invalid waves.yaml plan."""


class ConfigError(OrkiestraError):
    """Invalid orkiestra.toml configuration."""


class GitError(OrkiestraError):
    """A git command failed."""

    def __init__(self, message: str, stderr: str = "") -> None:
        super().__init__(message)
        self.stderr = stderr


class GitHubError(OrkiestraError):
    """A gh command failed."""

    def __init__(self, message: str, stderr: str = "") -> None:
        super().__init__(message)
        self.stderr = stderr


class AgentError(OrkiestraError):
    """The agent process could not be run at all (missing binary etc.)."""


class QuotaExhausted(OrkiestraError):
    """Antigravity quota / rate limit is spent."""

    def __init__(self, message: str, reset_seconds: int | None = None) -> None:
        super().__init__(message)
        self.reset_seconds = reset_seconds
