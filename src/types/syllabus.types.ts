export type Syllabus = {
    id: string
}

export type SyllabusPrototype = {
    uid: string;
    createdAt: string;
    lastModifiedAt: string;
    author: string;
    coAuthors: string[];
    metaData: SyllabusMetaData;
    status: SyllabusStatus;
    approvers: string[];
    approveDate: string;
    reviewers: string[];
    deadline: string;
    schoolYear: SyllabusSchoolYear;
    
}

export type SyllabusMetaData = {

}

export type SyllabusStatus = 'pending' | 'approved' | 'overdue';

export type SyllabusSchoolYear = {
    start: number;
    end: number;
}