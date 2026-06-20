import { redirect } from "react-router";
import type { RouteObject } from "react-router";
import Syllabus from "@/pages/syllabus/syllabus";
import SyllabusDetail from "@/pages/syllabus/syllabus-detail";

const syllabusRoutes: RouteObject[] = [
  {
    index: true,
    loader: () => redirect("overview"),
  },
  {
    path: "overview",
    Component: Syllabus,
    handle: { title: "Syllabus" },
  },
  {
    path: ":id",
    Component: SyllabusDetail,
    handle: { title: "Syllabus Detail" },
  },
];

export default syllabusRoutes;
