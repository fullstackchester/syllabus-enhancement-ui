import type { ApiResponse } from "@/types/global.types"
import type { Syllabus } from "@/types/syllabus.types"

class SyllabusService {

    private readonly SYLLABUS_BASE_URL = "/api/syllabus";

    async getAllSyllabus(): Promise<ApiResponse<Syllabus[]>> {
        return fetch(this.SYLLABUS_BASE_URL).then(res => res.json())
    }

    async getSyllabusByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<ApiResponse<Syllabus[]>> {
        return fetch(this.SYLLABUS_BASE_URL +`?status=${status}`).then(res => res.json())
    }

    async getSyllabusByUID(uid: string): Promise<ApiResponse<Syllabus>> {
        return fetch(this.SYLLABUS_BASE_URL + `/${uid}`).then(res => res.json())
    }

    async getSyllabusByAuthorUID(authorUID: string): Promise<ApiResponse<Syllabus[]>> {
        return fetch(this.SYLLABUS_BASE_URL + `?authorUID=${authorUID}`).then(res => res.json())
    }
}


export default new SyllabusService();
