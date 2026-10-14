import argparse
import sys
import uuid
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables before app imports
load_dotenv()
sys.stdout.reconfigure(encoding='utf-8')

from app.core.security import hash_password
from app.core.supabase import get_supabase


def create_user(email: str, password: str, full_name: str, role: str = "admin", class_id: str = None):
    sb = get_supabase()

    # Check existing email
    existing = sb.table("users").select("id, role").eq("email", email).execute()
    if existing.data:
        print(f"[!] Ошибка: Пользователь с email '{email}' уже существует (роль: {existing.data[0]['role']}).")
        return False

    user_id = str(uuid.uuid4())
    hashed = hash_password(password)

    new_user = {
        "id": user_id,
        "email": email,
        "full_name": full_name,
        "password_hash": hashed,
        "role": role,
        "class_id": class_id,
        "points_balance": 0,
        "created_at": datetime.utcnow().isoformat(),
    }

    try:
        res = sb.table("users").insert(new_user).execute()
        if res.data:
            print("\n==========================================")
            print(" Успешно создан новый пользователь!")
            print("==========================================")
            print(f" ID        : {user_id}")
            print(f" Email     : {email}")
            print(f" Пароль    : {password}")
            print(f" ФИО       : {full_name}")
            print(f" Роль      : {role}")
            if class_id:
                print(f" Класс     : {class_id}")
            print("==========================================\n")
            return True
        else:
            print("[!] Ошибка создания пользователя в базе данных Supabase.")
            return False
    except Exception as e:
        err_msg = str(e)
        print(f"\n[!] Ошибка Supabase: {err_msg}")
        if "users_role_check" in err_msg.lower() or "23514" in err_msg:
            print("\n[!] ПОДСКАЗКА ПО ОГРАНИЧЕНИЮ РОЛЕЙ В БАЗЕ (CHECK CONSTRAINT):")
            print("В вашей базе данных Postgres роли ограничены ('student', 'psychologist', 'guest').")
            print("Чтобы разрешить роль 'admin', выполните в Supabase -> SQL Editor команду:")
            print("   ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;")
            print("   ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student', 'psychologist', 'admin', 'guest'));")
        elif "row-level security" in err_msg.lower() or "42501" in err_msg:
            print("\n[!] ПОДСКАЗКА ПО Supabase RLS:")
            print("В Supabase включен Row Level Security. Чтобы разрешить создание пользователей:")
            print("1. Вставьте Service Role Key в backend/.env (SUPABASE_KEY=ваш_service_role_key)")
            print("ИЛИ")
            print("2. Выполните в SQL Editor в панеле Supabase команду:")
            print("   CREATE POLICY \"public_users_all\" ON users FOR ALL TO public USING (true) WITH CHECK (true);")
        return False


def main():
    parser = argparse.ArgumentParser(description="Скрипт для создания Superuser (Admin) или Психолога в AISezim")
    parser.add_argument("--email", required=True, help="Email пользователя (логин)")
    parser.add_argument("--password", required=True, help="Пароль (минимум 6 символов)")
    parser.add_argument("--name", required=True, help="Полное имя / ФИО")
    parser.add_argument("--role", default="admin", choices=["admin", "psychologist", "student"], help="Роль (admin/psychologist/student)")
    parser.add_argument("--class-id", default=None, help="Класс (необязательно)")

    args = parser.parse_args()

    if len(args.password) < 6:
        print("[!] Ошибка: Пароль должен содержать не менее 6 символов.")
        sys.exit(1)

    success = create_user(
        email=args.email,
        password=args.password,
        full_name=args.name,
        role=args.role,
        class_id=args.class_id,
    )
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
