# Danh sách các file làm việc với nhau trong Authentication & Permission Management

## 🔐 **AUTHENTICATION SYSTEM**

### **1. Core Authentication Files**

#### **`app/api/auth.py`** - Authentication API Endpoints
- **Chức năng**: Xử lý các endpoint đăng nhập, đăng ký, quản lý token
- **Endpoints**: `/auth/signup`, `/auth/login`, `/auth/me`, `/auth/roles`, `/auth/permissions`
- **Dependencies**:
  - `app.services.auth_service` - Business logic cho auth
  - `app.core.permissions` - Permission checking
  - `app.services.role_service` - Role management

#### **`app/services/auth_service.py`** - Authentication Business Logic
- **Chức năng**: Logic xử lý đăng ký, đăng nhập, tạo token
- **Functions**: `register_user()`, `authenticate_user()`, `create_user_token()`, `get_current_user_info()`
- **Dependencies**:
  - `app.core.database` - Database operations
  - `app.core.security` - Password hashing, JWT
  - `app.services.role_service` - User permissions
  - `app.schemas.user` - Data models

#### **`app/core/auth_middleware.py`** - Authentication Middleware
- **Chức năng**: Middleware xác thực JWT token và kiểm tra admin
- **Functions**: `get_current_user()`, `require_admin()`
- **Dependencies**:
  - `app.core.config` - JWT settings
  - `app.core.database` - User lookup

#### **`app/core/security.py`** - Security Utilities
- **Chức năng**: Password hashing, JWT token creation/validation
- **Functions**: `get_password_hash()`, `verify_password()`, `create_access_token()`

### **2. Permission Management Files**

#### **`app/core/permissions.py`** - Permission Checking Logic
- **Chức năng**: Kiểm tra quyền, superuser, active user
- **Functions**: `get_current_user()`, `get_current_active_user()`, `require_permission()`, `require_superuser()`
- **Dependencies**:
  - `app.services.role_service` - Permission checking
  - `app.schemas.user` - User models

#### **`app/services/role_service.py`** - Role & Permission Service
- **Chức năng**: Quản lý roles, permissions, user assignments
- **Functions**: 
  - Permission: `create_permission()`, `get_all_permissions()`, `check_permission()`
  - Role: `create_role()`, `get_all_roles()`, `assign_role_to_user()`
  - User: `get_user_permissions()`, `initialize_default_permissions()`

#### **`app/api/permissions.py`** - Permission API Endpoints
- **Chức năng**: CRUD operations cho permissions
- **Endpoints**: `/permissions/` (GET, POST, PUT, DELETE)
- **Dependencies**:
  - `app.core.auth_middleware` - Admin authentication
  - `app.services.role_service` - Permission operations
  - `app.schemas.permission` - Permission models

### **3. Data Models & Schemas**

#### **`app/models/user.py`** - User Database Model
- **Chức năng**: Định nghĩa cấu trúc user trong MongoDB
- **Fields**: username, hashed_password, roles, permissions, is_active, is_superuser

#### **`app/schemas/user.py`** - User Pydantic Schemas
- **Chức năng**: Validation và serialization cho user data
- **Schemas**: `UserCreate`, `UserLogin`, `UserOut`, `UserUpdate`, `Token`

#### **`app/schemas/permission.py`** - Permission Pydantic Schemas
- **Chức năng**: Validation cho permission data
- **Schemas**: `PermissionCreate`, `PermissionUpdate`, `PermissionOut`

### **4. Configuration & Database**

#### **`app/core/config.py`** - Application Settings
- **Chức năng**: Cấu hình JWT, database, CORS
- **Settings**: JWT secret, algorithm, token expiry, MongoDB URL

#### **`app/core/database.py`** - Database Connection
- **Chức năng**: MongoDB connection management
- **Functions**: `connect_to_mongo()`, `get_collection()`, `get_database()`

## 🔄 **LUỒNG TƯƠNG TÁC GIỮA CÁC FILE**

### **Authentication Flow**
```
1. Client Request → app/api/auth.py
2. auth.py → app/services/auth_service.py (business logic)
3. auth_service.py → app/core/database.py (database operations)
4. auth_service.py → app/core/security.py (password/JWT)
5. auth_service.py → app/services/role_service.py (permissions)
6. Response ← auth.py ← auth_service.py
```

### **Permission Checking Flow**
```
1. API Request → app/core/permissions.py (middleware)
2. permissions.py → app/core/auth_middleware.py (JWT validation)
3. auth_middleware.py → app/core/database.py (user lookup)
4. permissions.py → app/services/role_service.py (permission check)
5. Allow/Deny → API Endpoint
```

### **Role Management Flow**
```
1. Permission Request → app/api/permissions.py
2. permissions.py → app/core/auth_middleware.py (admin check)
3. permissions.py → app/services/role_service.py (CRUD operations)
4. role_service.py → app/core/database.py (database operations)
5. Response ← permissions.py ← role_service.py
```

## 📁 **CẤU TRÚC THƯ MỤC**

```
be/app/
├── api/
│   ├── auth.py              # Authentication endpoints
│   ├── permissions.py       # Permission management endpoints
│   └── users.py            # User management endpoints
├── core/
│   ├── auth_middleware.py  # JWT middleware
│   ├── config.py           # App configuration
│   ├── database.py         # Database connection
│   ├── permissions.py      # Permission checking logic
│   └── security.py         # Security utilities
├── models/
│   └── user.py             # User database model
├── schemas/
│   ├── permission.py       # Permission schemas
│   └── user.py             # User schemas
├── services/
│   ├── auth_service.py     # Authentication business logic
│   └── role_service.py     # Role & permission service
└── main.py                 # App entry point
```

## 🔗 **DEPENDENCY RELATIONSHIPS**

### **Core Dependencies**
- `main.py` → imports all API routers
- `auth.py` → `auth_service.py` + `permissions.py`
- `permissions.py` → `role_service.py` + `auth_middleware.py`
- `users.py` → `permissions.py` + `database.py`

### **Service Dependencies**
- `auth_service.py` → `database.py` + `security.py` + `role_service.py`
- `role_service.py` → `database.py`
- `permissions.py` → `role_service.py` + `auth_middleware.py`

### **Middleware Dependencies**
- `auth_middleware.py` → `config.py` + `database.py`
- `permissions.py` → `role_service.py` + `auth_middleware.py`

## ⚡ **KEY INTEGRATION POINTS**

1. **JWT Token Flow**: `auth_middleware.py` ↔ `security.py` ↔ `config.py`
2. **Database Operations**: Tất cả services → `database.py`
3. **Permission Checking**: API endpoints → `permissions.py` → `role_service.py`
4. **User Management**: `auth_service.py` ↔ `role_service.py` ↔ `database.py`
5. **Configuration**: Tất cả files → `config.py` cho settings
