import { curry } from "lodash/fp";

type SORT_DIRECTION = "ASC" | "DSC";
/**
 * sort a an array of object by a numerical field inside
 * @param {'ASC' | 'DSC'} type
 * @param {string} field
 * @param {Array<Object>} predicates
 */
export const sortByNumericalField = curry(
  <T extends Record<string, any>>(
    type: SORT_DIRECTION,
    field: keyof T,
    objects: T[]
  ) => {
    return objects.slice().sort((a, b) => {
      const aValue = a[field] as number;
      const bValue = b[field] as number;
      switch (type) {
        case "ASC":
          return aValue - bValue;
        case "DSC":
          return bValue - aValue;
        default:
          return 0;
      }
    });
  }
);