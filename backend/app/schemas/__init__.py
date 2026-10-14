from app.schemas.user import (
    UserRole,
    UserCreate,
    UserCreateAdmin,
    UserLogin,
    UserOut,
    Token,
    GuestToken,
)
from app.schemas.department import (
    DepartmentBase,
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentOut,
    DepartmentWithTeachers,
)
from app.schemas.assessment import (
    RiskLevel,
    AnswerItem,
    AssessmentSubmit,
    ScaleResult,
    QuestionResponseBase,
    QuestionResponseCreate,
    QuestionResponseOut,
    AssessmentResult,
    TestQuestion,
    TestInfo,
    AssessmentListItem,
)
from app.schemas.mood import MoodEntry, MoodEntryOut, MoodStats, DailyStress, WeekdayStats
from app.schemas.chat import DialogStatus, SenderRole, ChatMessage, SendMessage, DialogOut, ReplyMessage
from app.schemas.podcast import PodcastUpload, PodcastItem, PodcastListResponse
from app.schemas.qa import QuestionCreate, QuestionAnswer, QAQuestionOut, QAListResponse
