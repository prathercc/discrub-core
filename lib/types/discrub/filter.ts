import type { Message } from "../discord-types.ts";
import { FilterName, FilterType } from "../../enum/discrub-enum.ts";

export type Filter =
  | {
      filterName?: undefined;
      filterValue?: string | null;
      filterType: FilterType.THREAD;
    }
  | {
      filterValue?: string | string[] | null;
      filterType: FilterType.TEXT;
      filterName:
        | FilterName.ATTACHMENT_NAME
        | FilterName.CONTENT
        | keyof Message;
    }
  | {
      filterValue?: Date | null;
      filterType: FilterType.DATE;
      filterName: FilterName.END_TIME | FilterName.START_TIME;
    }
  | {
      filterValue: boolean;
      filterType: FilterType.TOGGLE;
      filterName: FilterName.INVERSE;
    }
  | {
      filterName: FilterName.MESSAGE_TYPE;
      filterValue: string[];
      filterType: FilterType.ARRAY;
    };