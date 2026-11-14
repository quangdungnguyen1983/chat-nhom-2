// Đọc body ở CHẾ ĐỘ NGHIÊM (GT-07): trường lạ hoặc sai kiểu → 400 VALIDATION_ERROR.
import { z } from "zod";
import { validationError } from "./errors.js";
export function parseStrict(shape, input, missingMessage) {
    const result = z.object(shape).strict().safeParse(input ?? {});
    if (result.success)
        return result.data;
    const fields = {};
    for (const issue of result.error.issues) {
        if (issue.code === "unrecognized_keys") {
            for (const k of issue.keys)
                fields[k] = "Trường không được phép.";
        }
        else {
            const key = String(issue.path[0] ?? "_");
            fields[key] ??= missingMessage ?? "Giá trị không hợp lệ.";
        }
    }
    throw validationError(fields, missingMessage);
}
export const str = () => z.string().max(1000);
