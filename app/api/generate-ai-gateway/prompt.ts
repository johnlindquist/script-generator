import {
  getAPIDocsContent,
  getDocsMini,
  getExampleScripts,
  getGuideContent,
  getKitTypes,
  getMetadataContent,
  getPromptContent,
  getSystemContent,
} from '@/lib/generation'

/*

metadata = {
    name: "Name of the Script",
    description: "Description of the script",
    author: "Author from above"
}
    */

export const DRAFT_PASS_PROMPT = `
<SYSTEM>
${getSystemContent()}
</SYSTEM>

<GUIDE>
${getGuideContent()}
</GUIDE>

<API_DOCS>
${getAPIDocsContent()}
</API_DOCS>

<MINI_DOCS>
${getDocsMini()}
</MINI_DOCS>

<TYPES>
${getKitTypes()}
</TYPES>

<EXAMPLES>
${getExampleScripts()}
</EXAMPLES>

<METADATA>
${getMetadataContent()}
</METADATA>

<STRUCTURED_SCRIPT_KIT_DOCS>
{structured_script_kit_docs}
</STRUCTURED_SCRIPT_KIT_DOCS>

<PROMPT>
${getPromptContent()}
</PROMPT>

<USER_PROMPT>
{prompt}
</USER_PROMPT>

Generate ONLY the script content below this line:
`
