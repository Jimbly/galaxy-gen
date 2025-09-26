import SimpleMarkdown, {
  ParserRule,
  ParserRules,
} from 'glov/client/simple-markdown';
import type { TSMap } from 'glov/common/types';
import { has } from 'glov/common/util';

// Example from docs
// let underline_rule = {
//   // Specify the order in which this rule is to be run
//   order: SimpleMarkdown.defaultRules.em.order - 0.5,
//
//   // First we check whether a string matches
//   match: function (source: string) {
//     return /^__([\s\S]+?)__(?!_)/.exec(source);
//   },
//
//   // Then parse this string into a syntax node
//   parse: function (capture, parse, state) {
//     return {
//       content: parse(capture[1], state)
//     };
//   },
// };

let renderable_regex = /^\[([^\s\]=]+)(=?[^\s\]]*)( [^\]]+)?\](?!\()/;
let renderable_param_regex = / ([^=]+)(?:=(?:"([^"]+)"|(\S+)))?/g;
export type RenderableParam = TSMap<number | string | true>;
export type RenderableContent = {
  type: string;
  key: string; // possibly empty string
  param?: RenderableParam;
  orig_text: string; // should only be used for error handling
};
let valid_renderables: TSMap<unknown> = {};
export function mdParseSetValidRenderables(set: TSMap<unknown>): void {
  valid_renderables = set;
}
let renderable_rule: ParserRule = {
  order: SimpleMarkdown.defaultRules.link.order - 0.5,

  // First we check whether a string matches
  match: function (source: string) {
    let capture = renderable_regex.exec(source);
    if (capture) {
      let type = capture[1];
      if (capture[2].startsWith('=')) {
        capture[2] = capture[2].slice(1);
      } else {
        // parameter-less only allowed for "closing" renderables
        if (!type.startsWith('/')) {
          return null;
        }
      }
      if (has(valid_renderables, type)) {
        return capture;
      }
    }
    return null;
  },

  // Then parse this string into a syntax node
  parse: function (capture, parse, state) {
    let param: RenderableParam | undefined;
    if (capture[3]) {
      param = {};
      capture[3].replace(renderable_param_regex, function (ignored: string, ...matches:string[]): string {
        let [key, val_quoted, val_basic] = matches;
        let v: number | string | true = val_quoted !== undefined ? val_quoted :
          val_basic !== undefined ? val_basic :
          true;
        if (typeof v === 'string') {
          let num = Number(v);
          if (isFinite(num)) {
            v = num;
          }
        }
        param![key] = v;
        return '';
      });
    }
    let content: RenderableContent = {
      type: capture[1],
      key: capture[2],
      param,
      orig_text: capture[0],
    };
    return {
      content,
    };
  },
};

type Writeable<T> = { -readonly [P in keyof T]: T[P] };
let rules: Writeable<ParserRules> = {
  renderable: renderable_rule,
};
// Enable rules we desire
([
  // 'heading',
  // 'nptable',
  // 'lheading',
  // 'hr',
  // 'codeBlock',
  // 'fence',
  // 'blockQuote',
  // 'list',
  // 'def',
  // 'table',
  // 'newline', // probably easy to support, what triggers it?
  'paragraph',
  'escape', // returns type "text"
  // 'tableSeparator',
  // 'autolink',
  // 'mailto',
  // 'url',
  // 'link',
  // 'image',
  // 'reflink',
  // 'refimage',
  'em',
  'strong',
  // 'u',
  // 'del',
  // 'inlineCode',
  // 'br', // probably easy to support, what triggers it?
  'text',
] as const).forEach((key) => (rules[key] = SimpleMarkdown.defaultRules[key]));

let reBuiltParser = SimpleMarkdown.parserFor(rules);

// export type MDASTBaseNode = {
//   type: string;
// };
export type MDNodeParagraph = {
  type: 'paragraph';
  content: Array<MDASTNode>;
};
export type MDNodeText = {
  type: 'text';
  content: string;
};
export type MDNodeItalic = {
  type: 'em';
  content: Array<MDASTNode>;
};
export type MDNodeBold = {
  type: 'strong';
  content: Array<MDASTNode>;
};
export type MDNodeRenderable = {
  type: 'renderable';
  content: RenderableContent;
};

export type MDASTNode = MDNodeParagraph | MDNodeText | MDNodeItalic | MDNodeBold | MDNodeRenderable;
// export function mdNodeIsParagraph(node: MDASTNode): node is MDNodeParagraph {
//   return node.type === 'paragraph';
// }
// export function mdNodeIsText(node: MDASTNode): node is MDNodeText {
//   return node.type === 'text';
// }
// export function mdNodeIsItaltic(node: MDASTNode): node is MDNodeItalic {
//   return node.type === 'em';
// }
// export function mdNodeIsBold(node: MDASTNode): node is MDNodeBold {
//   return node.type === 'strong';
// }
// export function mdNodeIsRenderable(node: MDASTNode): node is MDNodeRenderable {
//   return node.type === 'renderable';
// }

export function mdParse(source: string): Array<MDASTNode> {
  let blockSource = `${source}\n\n`;
  return reBuiltParser(blockSource, { inline: false }) as Array<MDASTNode>;
}

export function mdEscape(text: string): string {
  return text.replace(/([\\[*_])/g, '\\$1');
}
