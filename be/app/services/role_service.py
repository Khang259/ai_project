from re import U
from app.core.database import get_collection
from shared.logging import get_logger
from typing import List, Dict, Optional
from datetime import datetime
from bson import ObjectId
from app.schemas.user import RoleOut

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
    permission["id"] = str(result.inserted_id)
    del permission["_id"]
    
    logger.info(f"Created new permission: {permission_data['name']} by {created_by}")
    return permission

async def get_all_permissions() -> List[Dict]:
    """Get all permissions"""
    permissions_collection = get_collection("permissions")
    permissions = await permissions_collection.find({"is_active": True}).to_list(length=None)
    
    # Convert ObjectId to string
    for perm in permissions:
        perm["id"] = str(perm["_id"])
        del perm["_id"]
    
    return permissions

async def get_permission_by_id(permission_id: str) -> Optional[Dict]:
    """Get permission by ID"""
    try:
        permissions_collection = get_collection("permissions")
        permission = await permissions_collection.find_one({"_id": ObjectId(permission_id)})
        
        if permission:
            permission["id"] = str(permission["_id"])
            del permission["_id"]
        
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
    permissions_collection = get_collection("permissions")
    
    for role_data in DEFAULT_ROLES:
        existing = await roles_collection.find_one({"name": role_data["name"]})
        if not existing:
            # Convert permission names to ObjectIds
            permission_names = role_data.get("permissions", [])
            permission_object_ids = []
            
            for perm_name in permission_names:
                if perm_name == "*":
                    # Keep wildcard as is
                    permission_object_ids.append("*")
                else:
                    perm = await permissions_collection.find_one({"name": perm_name, "is_active": True})
                    if perm:
                        permission_object_ids.append(perm["_id"])
                    else:
                        logger.warning(f"Permission '{perm_name}' not found for role '{role_data['name']}'")
            
            role = {
                "name": role_data["name"],
                "description": role_data.get("description"),
                "permissions": permission_object_ids,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "created_by": "system"
            }
            await roles_collection.insert_one(role)
            logger.info(f"Created role: {role_data['name']}")

async def create_role(role_data: Dict, created_by: str) -> Dict:
    """Create a new role"""
    roles_collection = get_collection("roles")
    existing = await roles_collection.find_one({"name": role_data["name"]})
    if existing:
        raise ValueError(f"Role '{role_data['name']}' already exists")
    
    # Convert permission IDs (strings) to ObjectIds
    permission_ids = role_data.get("permissions", [])
    permission_object_ids = []
    for perm_id in permission_ids:
        if perm_id == "*":
            # Keep wildcard as is
            permission_object_ids.append("*")
        elif ObjectId.is_valid(perm_id):
            permission_object_ids.append(ObjectId(perm_id))
        else:
            logger.warning(f"Invalid permission ID: {perm_id}")
    
    role = {
        "name": role_data["name"],
        "description": role_data.get("description"),
        "permissions": permission_object_ids,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "created_by": created_by
    }
    result = await roles_collection.insert_one(role)
    role["id"] = str(result.inserted_id)
    del role["_id"]
    # Convert permissions back to strings for response
    role["permissions"] = [str(p) if p != "*" else "*" for p in permission_object_ids]
    logger.info(f"Created new role: {role_data['name']} by {created_by}")
    return role

async def update_role(role_id: str, update_data: Dict, updated_by: str) -> bool:
    """Update role"""
    try:
        roles_collection = get_collection("roles")
        
        # Check if role exists
        existing_role = await roles_collection.find_one({"_id": ObjectId(role_id)})
        if not existing_role:
            logger.error(f"Role '{role_id}' not found")
            return False
        
        # Check if new name conflicts with existing role
        if "name" in update_data and update_data["name"] != existing_role["name"]:
            name_conflict = await roles_collection.find_one({"name": update_data["name"]})
            if name_conflict:
                raise ValueError(f"Role name '{update_data['name']}' already exists")
        
        update_data["updated_at"] = datetime.utcnow()
        update_data["updated_by"] = updated_by
        
        result = await roles_collection.update_one(
            {"_id": ObjectId(role_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            logger.info(f"Updated role '{role_id}' by {updated_by}")
            return True
        
        return False
    except ValueError as e:
        logger.error(f"Validation error updating role '{role_id}': {e}")
        raise
    except Exception as e:
        logger.error(f"Error updating role '{role_id}': {e}")
        return False

async def delete_role(role_id: str, deleted_by: str) -> bool:
    """Soft delete role (set is_active to False)"""
    try:
        roles_collection = get_collection("roles")
        
        # Check if role exists
        existing_role = await roles_collection.find_one({"_id": ObjectId(role_id)})
        if not existing_role:
            logger.error(f"Role '{role_id}' not found")
            return False
        
        # Check if role is in use (roles are stored as ObjectIds)
        users_collection = get_collection("users")
        users_with_role = await users_collection.count_documents({"roles": ObjectId(role_id)})
        if users_with_role > 0:
            raise ValueError(f"Cannot delete role '{existing_role['name']}' - {users_with_role} users still have this role")
        
        result = await roles_collection.update_one(
            {"_id": ObjectId(role_id)},
            {"$set": {
                "is_active": False,
                "deleted_at": datetime.utcnow(),
                "deleted_by": deleted_by
            }}
        )
        
        if result.modified_count > 0:
            logger.info(f"Deleted role '{role_id}' by {deleted_by}")
            return True
        
        return False
    except ValueError as e:
        logger.error(f"Validation error deleting role '{role_id}': {e}")
        raise
    except Exception as e:
        logger.error(f"Error deleting role '{role_id}': {e}")
        return False

async def get_role_by_id(role_id: str) -> Optional[Dict]:
    """Get role by ID"""
    try:
        roles_collection = get_collection("roles")
        role = await roles_collection.find_one({"_id": ObjectId(role_id)})
        
        if role:
            role["id"] = str(role["_id"])
            del role["_id"]
            
            # Convert permission ObjectIds to strings
            permissions = role.get("permissions", [])
            role["permissions"] = [str(p) if p != "*" else "*" for p in permissions]
            
            # Ensure required fields exist with default values
            if "updated_at" not in role:
                role["updated_at"] = role.get("created_at", datetime.utcnow())
        
        return role
    except Exception as e:
        logger.error(f"Error getting role by ID {role_id}: {e}")
        return None

async def get_all_roles() -> List[Dict]:
    """Get all roles"""
    roles_collection = get_collection("roles")
    roles = await roles_collection.find({"is_active": True}).to_list(length=None)
    
    # Convert ObjectId to string and ensure all required fields exist
    for role in roles:
        role["id"] = str(role["_id"])
        del role["_id"]
        
        # Convert permission ObjectIds to strings
        permissions = role.get("permissions", [])
        role["permissions"] = [str(p) if p != "*" else "*" for p in permissions]
        
        # Ensure required fields exist with default values
        if "updated_at" not in role:
            role["updated_at"] = role.get("created_at", datetime.utcnow())
    
    return roles  # ✅ Trả về List[Dict]

async def get_role_by_name(role_name: str) -> Optional[Dict]:
    """Get role by name"""
    roles_collection = get_collection("roles")
    role = await roles_collection.find_one({"name": role_name, "is_active": True})
    
    if role:
        role["_id"] = str(role["_id"])
        # Convert permission ObjectIds to strings
        permissions = role.get("permissions", [])
        role["permissions"] = [str(p) if p != "*" else "*" for p in permissions]
    
    return role

async def assign_role_to_user(user_id: str, role_id: str) -> bool:
    """Assign role to user by role ID"""
    try:
        users_collection = get_collection("users")
        roles_collection = get_collection("roles")
        
        # Validate role_id format
        if not ObjectId.is_valid(role_id):
            logger.error(f"Invalid role ID format: {role_id}")
            return False
        
        # Check if role exists
        role = await roles_collection.find_one({"_id": ObjectId(role_id), "is_active": True})
        if not role:
            logger.error(f"Role with ID '{role_id}' not found")
            return False
        
        # Check if user exists
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            logger.error(f"User '{user_id}' not found")
            return False
        
        # Add role ObjectId to user's roles if not already present
        current_roles = user.get("roles", [])
        username = user.get("username", user_id)
        role_object_id = ObjectId(role_id)
        
        if role_object_id not in current_roles:
            await users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$addToSet": {"roles": role_object_id},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            logger.info(f"Assigned role '{role['name']}' (ID: {role_id}) to user '{username}'")
            return True
        else:
            logger.info(f"User '{username}' already has role '{role['name']}'")
            return True
            
    except Exception as e:
        logger.error(f"Error assigning role '{role_id}' to user '{user_id}': {e}")
        return False

async def remove_role_from_user(user_id: str, role_id: str) -> bool:
    """Remove role from user by role ID"""
    try:
        users_collection = get_collection("users")
        roles_collection = get_collection("roles")
        
        # Validate role_id format
        if not ObjectId.is_valid(role_id):
            logger.error(f"Invalid role ID format: {role_id}")
            return False
        
        # Check if user exists
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            logger.error(f"User '{user_id}' not found")
            return False
        
        # Get role name for logging
        role = await roles_collection.find_one({"_id": ObjectId(role_id)})
        role_name = role["name"] if role else "Unknown"
        
        # Remove role ObjectId from user's roles
        current_roles = user.get("roles", [])
        username = user.get("username", user_id)
        role_object_id = ObjectId(role_id)
        
        if role_object_id in current_roles:
            await users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {
                    "$pull": {"roles": role_object_id},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            logger.info(f"Removed role '{role_name}' (ID: {role_id}) from user '{username}'")
            return True
        else:
            logger.info(f"User '{username}' does not have role '{role_name}'")
            return True
            
    except Exception as e:
        logger.error(f"Error removing role '{role_id}' from user '{user_id}': {e}")
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
        
        # Add permissions from roles (roles are stored as ObjectIds)
        user_role_ids = user.get("roles", [])
        permissions_collection = get_collection("permissions")
        
        for role_id in user_role_ids:
            # Ensure role_id is ObjectId
            if not isinstance(role_id, ObjectId):
                role_id = ObjectId(role_id) if ObjectId.is_valid(str(role_id)) else None
            if role_id:
                role = await roles_collection.find_one({"_id": role_id, "is_active": True})
                if role:
                    # permissions stored as ObjectIds, need to get permission names
                    role_permission_ids = role.get("permissions", [])
                    for perm_id in role_permission_ids:
                        # Check if it's wildcard permission FIRST
                        if perm_id == "*":
                            permissions.add("*")
                            continue
                        
                        # Ensure perm_id is ObjectId
                        if not isinstance(perm_id, ObjectId):
                            perm_id = ObjectId(perm_id) if ObjectId.is_valid(str(perm_id)) else None
                        if perm_id:
                            perm = await permissions_collection.find_one({"_id": perm_id, "is_active": True})
                            if perm:
                                permissions.add(perm["name"])
        
        # If user has wildcard permission, return all permissions
        if "*" in permissions:
            logger.info(f"User '{user_id}' has wildcard permission (*) - granting ALL permissions")
            all_permissions = await get_all_permissions()
            return [perm["name"] for perm in all_permissions]
        
        logger.debug(f"User '{user_id}' permissions: {list(permissions)}")
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
        perm["id"] = str(perm["_id"])
        del perm["_id"]
    
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
        perm["id"] = str(perm["_id"])
        del perm["_id"]
    
    return permissions

async def assign_permission_to_role(role_id: str, permission_id: str) -> bool:
    """Gán permission cho role"""
    roles_collection = get_collection("roles")
    permissions_collection = get_collection("permissions")
    
    # Kiểm tra role có tồn tại không
    if not ObjectId.is_valid(role_id):
        logger.warning(f"Invalid role ID format: {role_id}")
        return False
    
    role = await roles_collection.find_one({"_id": ObjectId(role_id)})
    if not role:
        logger.warning(f"Role not found: {role_id}")
        return False
    
    # Kiểm tra permission có tồn tại không
    if not ObjectId.is_valid(permission_id):
        logger.warning(f"Invalid permission ID format: {permission_id}")
        return False
    
    permission = await permissions_collection.find_one({"_id": ObjectId(permission_id)})
    if not permission:
        logger.warning(f"Permission not found: {permission_id}")
        return False
    
    # Kiểm tra permission đã có trong role chưa (permissions stored as ObjectIds)
    current_permissions = role.get("permissions", [])
    permission_object_id = ObjectId(permission_id)
    permission_name = permission["name"]
    
    if permission_object_id in current_permissions:
        logger.warning(f"Permission '{permission_name}' already assigned to role '{role['name']}'")
        return False
    
    # Thêm permission ObjectId vào role
    result = await roles_collection.update_one(
        {"_id": ObjectId(role_id)},
        {
            "$addToSet": {"permissions": permission_object_id},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.modified_count > 0:
        logger.info(f"Permission '{permission_name}' (ID: {permission_id}) assigned to role '{role['name']}' successfully")
        return True
    else:
        logger.error(f"Failed to assign permission to role")
        return False

async def remove_permission_from_role(role_id: str, permission_id: str) -> bool:
    """Xóa permission khỏi role"""
    roles_collection = get_collection("roles")
    permissions_collection = get_collection("permissions")
    
    # Kiểm tra role có tồn tại không
    if not ObjectId.is_valid(role_id):
        logger.warning(f"Invalid role ID format: {role_id}")
        return False
    
    role = await roles_collection.find_one({"_id": ObjectId(role_id)})
    if not role:
        logger.warning(f"Role not found: {role_id}")
        return False
    
    # Kiểm tra permission có tồn tại không
    if not ObjectId.is_valid(permission_id):
        logger.warning(f"Invalid permission ID format: {permission_id}")
        return False
    
    permission = await permissions_collection.find_one({"_id": ObjectId(permission_id)})
    if not permission:
        logger.warning(f"Permission not found: {permission_id}")
        return False
    
    # Kiểm tra permission có trong role không (permissions stored as ObjectIds)
    current_permissions = role.get("permissions", [])
    permission_object_id = ObjectId(permission_id)
    permission_name = permission["name"]
    
    if permission_object_id not in current_permissions:
        logger.warning(f"Permission '{permission_name}' not found in role '{role['name']}'")
        return False
    
    # Xóa permission ObjectId khỏi role
    result = await roles_collection.update_one(
        {"_id": ObjectId(role_id)},
        {
            "$pull": {"permissions": permission_object_id},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.modified_count > 0:
        logger.info(f"Permission '{permission_name}' (ID: {permission_id}) removed from role '{role['name']}' successfully")
        return True
    else:
        logger.error(f"Failed to remove permission from role")
        return False