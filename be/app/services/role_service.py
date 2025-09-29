from app.core.database import get_collection
from shared.logging import get_logger
from typing import List, Dict, Optional
from datetime import datetime
from bson import ObjectId

logger = get_logger("camera_ai_app")

# Default roles
DEFAULT_ROLES = [
    {
        "name": "admin",
        "description": "Full system administrator with all permissions",
        "permissions": ["*"],  # Wildcard for all permissions
        "is_active": True
    },
    {
        "name": "user",
        "description": "Regular user with basic permissions",
        "permissions": [
            "cameras:read", "analytics:read", "workflows:read",
            "settings:read", "logs:read"
        ],
        "is_active": True
    },
    {
        "name": "viewer",
        "description": "Read-only access user",
        "permissions": [
            "cameras:read", "analytics:read", "workflows:read"
        ],
        "is_active": True
    },
    {
        "name": "operator",
        "description": "Camera operator with write permissions",
        "permissions": [
            "cameras:read", "cameras:write", "analytics:read",
            "workflows:read", "workflows:write"
        ],
        "is_active": True
    }
]

# Default permissions (moved from permission_service to avoid circular import)
DEFAULT_PERMISSIONS = [
    {"name": "users:read", "description": "Read user information", "resource": "users", "action": "read"},
    {"name": "users:write", "description": "Create and update users", "resource": "users", "action": "write"},
    {"name": "users:delete", "description": "Delete users", "resource": "users", "action": "delete"},
    {"name": "users:admin", "description": "Full user administration", "resource": "users", "action": "admin"},
    
    {"name": "cameras:read", "description": "View camera feeds and settings", "resource": "cameras", "action": "read"},
    {"name": "cameras:write", "description": "Configure cameras", "resource": "cameras", "action": "write"},
    {"name": "cameras:delete", "description": "Remove cameras", "resource": "cameras", "action": "delete"},
    {"name": "cameras:admin", "description": "Full camera administration", "resource": "cameras", "action": "admin"},
    
    {"name": "analytics:read", "description": "View analytics data", "resource": "analytics", "action": "read"},
    {"name": "analytics:write", "description": "Create and update analytics", "resource": "analytics", "action": "write"},
    {"name": "analytics:delete", "description": "Delete analytics data", "resource": "analytics", "action": "delete"},
    {"name": "analytics:admin", "description": "Full analytics administration", "resource": "analytics", "action": "admin"},
    
    {"name": "workflows:read", "description": "View workflows", "resource": "workflows", "action": "read"},
    {"name": "workflows:write", "description": "Create and update workflows", "resource": "workflows", "action": "write"},
    {"name": "workflows:delete", "description": "Delete workflows", "resource": "workflows", "action": "delete"},
    {"name": "workflows:admin", "description": "Full workflow administration", "resource": "workflows", "action": "admin"},
    
    {"name": "system:admin", "description": "System administration", "resource": "system", "action": "admin"},
    {"name": "logs:read", "description": "View system logs", "resource": "logs", "action": "read"},
    {"name": "settings:read", "description": "View system settings", "resource": "settings", "action": "read"},
    {"name": "settings:write", "description": "Modify system settings", "resource": "settings", "action": "write"},
]

# ==================== PERMISSION FUNCTIONS ====================

async def initialize_default_permissions():
    """Initialize default permissions in database"""
    permissions_collection = get_collection("permissions")
    
    for perm_data in DEFAULT_PERMISSIONS:
        existing = await permissions_collection.find_one({"name": perm_data["name"]})
        if not existing:
            permission = {
                **perm_data,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "created_by": "system"
            }
            await permissions_collection.insert_one(permission)
            logger.info(f"Created permission: {perm_data['name']}")

async def create_permission(permission_data: Dict, created_by: str) -> Dict:
    """Create a new permission"""
    permissions_collection = get_collection("permissions")
    
    # Check if permission already exists
    existing = await permissions_collection.find_one({"name": permission_data["name"]})
    if existing:
        raise ValueError(f"Permission '{permission_data['name']}' already exists")
    
    permission = {
        **permission_data,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "created_by": created_by
    }
    
    result = await permissions_collection.insert_one(permission)
    permission["_id"] = str(result.inserted_id)
    
    logger.info(f"Created new permission: {permission_data['name']} by {created_by}")
    return permission

async def get_all_permissions() -> List[Dict]:
    """Get all permissions"""
    permissions_collection = get_collection("permissions")
    permissions = await permissions_collection.find({"is_active": True}).to_list(length=None)
    
    # Convert ObjectId to string
    for perm in permissions:
        perm["_id"] = str(perm["_id"])
    
    return permissions

async def get_permission_by_id(permission_id: str) -> Optional[Dict]:
    """Get permission by ID"""
    try:
        permissions_collection = get_collection("permissions")
        permission = await permissions_collection.find_one({"_id": ObjectId(permission_id)})
        
        if permission:
            permission["_id"] = str(permission["_id"])
        
        return permission
    except Exception as e:
        logger.error(f"Error getting permission by ID {permission_id}: {e}")
        return None

async def update_permission(permission_id: str, update_data: Dict, updated_by: str) -> bool:
    """Update permission"""
    try:
        permissions_collection = get_collection("permissions")
        
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = updated_by
        
        result = await permissions_collection.update_one(
            {"_id": ObjectId(permission_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            logger.info(f"Updated permission {permission_id} by {updated_by}")
            return True
        
        return False
    except Exception as e:
        logger.error(f"Error updating permission {permission_id}: {e}")
        return False

async def delete_permission(permission_id: str, deleted_by: str) -> bool:
    """Soft delete permission (set is_active to False)"""
    try:
        permissions_collection = get_collection("permissions")
        
        result = await permissions_collection.update_one(
            {"_id": ObjectId(permission_id)},
            {"$set": {
                "is_active": False,
                "deleted_at": datetime.utcnow(),
                "deleted_by": deleted_by
            }}
        )
        
        if result.modified_count > 0:
            logger.info(f"Deleted permission {permission_id} by {deleted_by}")
            return True
        
        return False
    except Exception as e:
        logger.error(f"Error deleting permission {permission_id}: {e}")
        return False

# ==================== ROLE FUNCTIONS ====================

async def initialize_default_roles():
    """Initialize default roles in database"""
    roles_collection = get_collection("roles")
    
    for role_data in DEFAULT_ROLES:
        existing = await roles_collection.find_one({"name": role_data["name"]})
        if not existing:
            role = {
                **role_data,
                "created_at": datetime.utcnow(),
                "created_by": "system"
            }
            await roles_collection.insert_one(role)
            logger.info(f"Created role: {role_data['name']}")

async def get_all_roles() -> List[Dict]:
    """Get all roles"""
    roles_collection = get_collection("roles")
    roles = await roles_collection.find({"is_active": True}).to_list(length=None)
    
    # Convert ObjectId to string
    for role in roles:
        role["_id"] = str(role["_id"])
    
    return roles

async def get_role_by_name(role_name: str) -> Optional[Dict]:
    """Get role by name"""
    roles_collection = get_collection("roles")
    role = await roles_collection.find_one({"name": role_name, "is_active": True})
    
    if role:
        role["_id"] = str(role["_id"])
    
    return role

async def assign_role_to_user(user_id: str, role_name: str) -> bool:
    """Assign role to user"""
    try:
        users_collection = get_collection("users")
        roles_collection = get_collection("roles")
        
        # Check if role exists
        role = await roles_collection.find_one({"name": role_name, "is_active": True})
        if not role:
            logger.error(f"Role '{role_name}' not found")
            return False
        
        # Check if user exists
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            logger.error(f"User '{user_id}' not found")
            return False
        
        # Add role to user's roles if not already present
        current_roles = user.get("roles", [])
        if role_name not in current_roles:
            await users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$addToSet": {"roles": role_name},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            logger.info(f"Assigned role '{role_name}' to user '{user_id}'")
            return True
        else:
            logger.info(f"User '{user_id}' already has role '{role_name}'")
            return True
            
    except Exception as e:
        logger.error(f"Error assigning role '{role_name}' to user '{user_id}': {e}")
        return False

async def remove_role_from_user(user_id: str, role_name: str) -> bool:
    """Remove role from user"""
    try:
        users_collection = get_collection("users")
        
        # Check if user exists
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            logger.error(f"User '{user_id}' not found")
            return False
        
        # Remove role from user's roles
        current_roles = user.get("roles", [])
        if role_name in current_roles:
            await users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$pull": {"roles": role_name},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            logger.info(f"Removed role '{role_name}' from user '{user_id}'")
            return True
        else:
            logger.info(f"User '{user_id}' does not have role '{role_name}'")
            return True
            
    except Exception as e:
        logger.error(f"Error removing role '{role_name}' from user '{user_id}': {e}")
        return False

# ==================== USER PERMISSION FUNCTIONS ====================

async def get_user_permissions(user_id: str) -> List[str]:
    """Get all permissions for a user (from roles + direct permissions)"""
    try:
        users_collection = get_collection("users")
        roles_collection = get_collection("roles")
        
        # Get user
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            logger.error(f"User '{user_id}' not found")
            return []
        
        # Start with direct permissions
        permissions = set(user.get("permissions", []))
        
        # Add permissions from roles
        user_roles = user.get("roles", [])
        for role_name in user_roles:
            role = await roles_collection.find_one({"name": role_name, "is_active": True})
            if role:
                role_permissions = role.get("permissions", [])
                permissions.update(role_permissions)
        
        # If user has wildcard permission, return all permissions
        if "*" in permissions:
            all_permissions = await get_all_permissions()
            return [perm["name"] for perm in all_permissions]
        
        return list(permissions)
        
    except Exception as e:
        logger.error(f"Error getting permissions for user '{user_id}': {e}")
        return []

async def check_permission(user_id: str, permission: str) -> bool:
    """Check if user has specific permission"""
    try:
        user_permissions = await get_user_permissions(user_id)
        
        # Check for wildcard permission
        if "*" in user_permissions:
            return True
        
        # Check for exact permission
        if permission in user_permissions:
            return True
        
        # Check for resource-level permission
        if ":" in permission:
            resource_action = permission.split(":")
            if len(resource_action) >= 2:
                base_permission = f"{resource_action[0]}:{resource_action[1]}"
                if base_permission in user_permissions:
                    return True
        
        return False
        
    except Exception as e:
        logger.error(f"Error checking permission '{permission}' for user '{user_id}': {e}")
        return False

# ==================== UTILITY FUNCTIONS ====================

async def get_permissions_by_resource(resource: str) -> List[Dict]:
    """Get all permissions for a specific resource"""
    permissions_collection = get_collection("permissions")
    permissions = await permissions_collection.find({
        "resource": resource,
        "is_active": True
    }).to_list(length=None)
    
    # Convert ObjectId to string
    for perm in permissions:
        perm["_id"] = str(perm["_id"])
    
    return permissions

async def get_permissions_by_action(action: str) -> List[Dict]:
    """Get all permissions for a specific action"""
    permissions_collection = get_collection("permissions")
    permissions = await permissions_collection.find({
        "action": action,
        "is_active": True
    }).to_list(length=None)
    
    # Convert ObjectId to string
    for perm in permissions:
        perm["_id"] = str(perm["_id"])
    
    return permissions