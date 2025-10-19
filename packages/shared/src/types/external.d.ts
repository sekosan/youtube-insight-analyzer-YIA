declare module 'franc-min' {
  type Options = {
    minLength?: number;
  };

  type Franc = (
    value: string,
    options?: Options
  ) => string;

  type FrancAll = (
    value: string,
    options?: Options
  ) => Array<[string, number]>;

  const franc: Franc & { all: FrancAll };
  export default franc;
}

declare module 'langs' {
  type LangRecord = {
    name: string;
    local: string;
    '1'?: string;
    '2'?: string;
    '3'?: string;
  };

  const langs: {
    where(scope: '1' | '2' | '3', value: string): LangRecord | undefined;
  };

  export default langs;
}
