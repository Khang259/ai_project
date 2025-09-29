import React from "react"; const Input = ({ className = "", ...props }) => { return <input className={`px-3 py-2 border rounded ${className}`} {...props} />; }; export { Input };
