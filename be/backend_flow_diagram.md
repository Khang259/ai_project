# Sơ đồ luồng hoạt động Backend CameraAI

## Luồng khởi động ứng dụng (main.py)

```mermaid
graph TD
    A[main.py - Khởi động ứng dụng] --> B[setup_logger - Thiết lập logging]
    B --> C[FastAPI App Creation]
    C --> D[CORS Middleware Setup]
    D --> E[Lifespan Events]
    
    E --> F[Startup: connect_to_mongo]
    F --> G[MongoDB Connection]
    G --> H[Database Ping Test]
    
    E --> I[API Routers Registration]
    I --> J[/auth - Authentication]
    I --> K[/users - User Management]
    I --> L[/permissions - Permission Management]
    
    E --> M[Uvicorn Server Start]
    M --> N[Server Running on Port 8000]
```

## Luồng xử lý request

```mermaid
graph TD
    A[HTTP Request] --> B[CORS Middleware]
    B --> C[Route Matching]
    
    C --> D{API Endpoint}
    D -->|/auth/*| E[Authentication Router]
    D -->|/users/*| F[Users Router]
    D -->|/permissions/*| G[Permissions Router]
    
    E --> H[Auth Service]
    F --> I[User Operations]
    G --> J[Permission Operations]
    
    H --> K[Database Operations]
    I --> K
    J --> K
    
    K --> L[MongoDB Collection]
    L --> M[Response]
    M --> N[JSON Response]
```

## Luồng Authentication

```mermaid
graph TD
    A[Login Request] --> B[Auth Router]
    B --> C[authenticate_user]
    C --> D[Database Query]
    D --> E[Password Verification]
    E --> F{Valid Credentials?}
    
    F -->|Yes| G[Update Last Login]
    F -->|No| H[Return Error]
    
    G --> I[create_user_token]
    I --> J[JWT Token Creation]
    J --> K[Return Token + User Info]
    
    L[Signup Request] --> M[register_user]
    M --> N[Check Existing User]
    N --> O{User Exists?}
    O -->|No| P[Hash Password]
    O -->|Yes| Q[Return Error]
    P --> R[Create User in DB]
    R --> S[Return Success]
```

## Luồng Database Operations

```mermaid
graph TD
    A[Database Request] --> B[get_collection]
    B --> C[MongoDB Connection]
    C --> D{Operation Type}
    
    D -->|Read| E[find/find_one]
    D -->|Write| F[insert_one/update_one]
    D -->|Delete| G[delete_one]
    
    E --> H[Query Results]
    F --> I[Write Results]
    G --> J[Delete Results]
    
    H --> K[Data Processing]
    I --> K
    J --> K
    
    K --> L[Response Formatting]
    L --> M[Return to API]
```

## Luồng Permission Management

```mermaid
graph TD
    A[Permission Request] --> B[Auth Middleware]
    B --> C[JWT Token Validation]
    C --> D{Valid Token?}
    
    D -->|No| E[Return 401]
    D -->|Yes| F[Extract User Info]
    
    F --> G[Permission Check]
    G --> H{Has Permission?}
    
    H -->|No| I[Return 403]
    H -->|Yes| J[Execute Operation]
    
    J --> K[Role Service]
    K --> L[Database Update]
    L --> M[Return Success]
```

## Cấu trúc thư mục và dependencies

```mermaid
graph TD
    A[be/] --> B[app/]
    A --> C[shared/]
    A --> D[env/]
    
    B --> E[main.py - Entry Point]
    B --> F[api/ - API Routes]
    B --> G[core/ - Core Services]
    B --> H[models/ - Data Models]
    B --> I[schemas/ - Pydantic Schemas]
    B --> J[services/ - Business Logic]
    
    F --> K[auth.py]
    F --> L[users.py]
    F --> M[permissions.py]
    
    G --> N[config.py - Settings]
    G --> O[database.py - DB Connection]
    G --> P[auth_middleware.py - Auth Logic]
    G --> Q[security.py - Security Utils]
    G --> R[permissions.py - Permission Logic]
    
    J --> S[auth_service.py]
    J --> T[role_service.py]
    
    C --> U[logging.py - Shared Logging]
    
    E --> F
    E --> G
    E --> J
    E --> C
```
