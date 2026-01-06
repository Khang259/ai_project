import api from "./api";

export const testAi = async () => {
    try {
        const response = await api.post("/ai/test-ai");
        console.log("Response from testAi:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error testing AI:", error);
        throw new Error(error.message || "Error testing AI");
    }
};