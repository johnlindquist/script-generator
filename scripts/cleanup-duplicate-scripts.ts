import { PrismaClient, type Script } from '@prisma/client'
import * as readline from 'readline'

const prisma = new PrismaClient()

// Function to ask for confirmation
function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question(`${question} (y/N): `, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y')
    })
  })
}

// Function to get content preview
function getContentPreview(content: string, maxLength = 150): string {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + '...'
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')
  const sampleSize = args.includes('--samples')
    ? Number(args[args.indexOf('--samples') + 1] || 5)
    : 5

  if (dryRun) {
    console.log('💧 Performing DRY RUN. No data will be deleted.')
  } else {
    console.log('🚨 WARNING: This script will permanently delete data.')
  }

  console.log('\nFetching all scripts...')
  // Fetch necessary fields for all scripts
  const allScripts = await prisma.script.findMany({
    select: {
      id: true,
      ownerId: true,
      content: true,
      createdAt: true,
      title: true, // Include title for logging purposes
    },
    orderBy: {
      createdAt: 'asc', // Get oldest first
    },
  })
  console.log(`Found ${allScripts.length} total scripts.`)

  console.log('\nGrouping scripts by owner and content...')
  // Use the exact type returned by the Prisma query
  type ScriptData = (typeof allScripts)[number]
  const scriptGroups = new Map<string, ScriptData[]>()

  for (const script of allScripts) {
    // Create a unique key based on owner and content
    // NOTE: Hashing content might be more memory efficient for very large scripts,
    // but comparing full content is more accurate for exact duplicates.
    const groupKey = `${script.ownerId}::${script.content}`

    if (!scriptGroups.has(groupKey)) {
      scriptGroups.set(groupKey, [])
    }
    scriptGroups.get(groupKey)?.push(script)
  }

  console.log(`Found ${scriptGroups.size} unique script content groups across all owners.`)

  const scriptsToDeleteIds: string[] = []
  const scriptsToKeepInfo: { id: string; title: string; ownerId: string }[] = []

  // For showing examples
  const duplicateExamples: Array<{
    kept: ScriptData
    duplicates: ScriptData[]
    contentPreview: string
    ownerId: string
  }> = []

  console.log('\nIdentifying duplicates...')
  let duplicateSetCount = 0
  for (const [groupKey, scriptsInGroup] of scriptGroups.entries()) {
    if (scriptsInGroup.length > 1) {
      duplicateSetCount++
      // Keep the first one (oldest, because we sorted by createdAt asc)
      const scriptToKeep = scriptsInGroup[0]
      scriptsToKeepInfo.push({
        id: scriptToKeep.id,
        title: scriptToKeep.title,
        ownerId: scriptToKeep.ownerId,
      })

      // Mark the rest for deletion
      const duplicates = scriptsInGroup.slice(1)
      duplicates.forEach(dup => scriptsToDeleteIds.push(dup.id))

      // Collect examples for display
      if (duplicateExamples.length < sampleSize) {
        duplicateExamples.push({
          kept: scriptToKeep,
          duplicates: duplicates,
          contentPreview: getContentPreview(scriptToKeep.content),
          ownerId: scriptToKeep.ownerId,
        })
      }
    }
  }

  console.log(`\nIdentified ${duplicateSetCount} sets of duplicate scripts.`)
  console.log(`Total duplicate scripts marked for deletion: ${scriptsToDeleteIds.length}`)

  if (scriptsToDeleteIds.length === 0) {
    console.log('\n✅ No duplicate scripts found to delete.')
    return
  }

  // Show duplicate examples
  console.log('\n--- Sample Duplicate Sets ---')
  duplicateExamples.forEach((example, i) => {
    console.log(`\nExample ${i + 1}:`)
    console.log(`Owner ID: ${example.ownerId}`)
    console.log(`Content preview: ${example.contentPreview}`)
    console.log(
      `KEEPING: Script ID ${example.kept.id} - "${example.kept.title}" (Created: ${example.kept.createdAt.toISOString()})`
    )
    console.log(`DUPLICATES TO DELETE (${example.duplicates.length}):`)
    example.duplicates.slice(0, 3).forEach(dup => {
      console.log(
        `  - Script ID: ${dup.id} - "${dup.title}" (Created: ${dup.createdAt.toISOString()})`
      )
    })
    if (example.duplicates.length > 3) {
      console.log(`  - ... and ${example.duplicates.length - 3} more duplicates`)
    }
  })
  console.log('---------------------------')

  // --- Display Summary ---
  console.log('\n--- Summary ---')
  console.log(`Scripts to keep (Oldest in each duplicate set): ${scriptsToKeepInfo.length}`)
  // Uncomment to list kept scripts (can be long)
  // scriptsToKeepInfo.forEach(s => console.log(`  - Keep ID: ${s.id}, Title: ${s.title}, Owner: ${s.ownerId}`));

  console.log(`\nScripts to delete: ${scriptsToDeleteIds.length}`)
  // Uncomment to list deleted scripts (can be long)
  // scriptsToDeleteIds.forEach(id => console.log(`  - Delete ID: ${id}`));
  console.log('---------------')

  // --- Execution ---
  if (dryRun) {
    console.log('\n💧 Dry run finished. No changes were made.')
  } else {
    const proceed = await askConfirmation(
      '\nDo you want to proceed with deleting these scripts and their related data?'
    )
    if (proceed) {
      console.log('\n⏳ Starting deletion process...')
      try {
        await prisma.$transaction(async tx => {
          // 1. Delete related data first
          console.log(`  Deleting related Favorites...`)
          const favDel = await tx.favorite.deleteMany({
            where: { scriptId: { in: scriptsToDeleteIds } },
          })
          console.log(`    Deleted ${favDel.count} Favorite records.`)

          console.log(`  Deleting related Installs...`)
          const insDel = await tx.install.deleteMany({
            where: { scriptId: { in: scriptsToDeleteIds } },
          })
          console.log(`    Deleted ${insDel.count} Install records.`)

          console.log(`  Deleting related Verifications...`)
          const verDel = await tx.verification.deleteMany({
            where: { scriptId: { in: scriptsToDeleteIds } },
          })
          console.log(`    Deleted ${verDel.count} Verification records.`)

          console.log(`  Deleting related ScriptVersions...`)
          const verSionDel = await tx.scriptVersion.deleteMany({
            where: { scriptId: { in: scriptsToDeleteIds } },
          })
          console.log(`    Deleted ${verSionDel.count} ScriptVersion records.`)

          // 2. Delete the duplicate scripts themselves
          console.log(`  Deleting duplicate Scripts...`)
          const scriptDel = await tx.script.deleteMany({
            where: { id: { in: scriptsToDeleteIds } },
          })
          console.log(`    Deleted ${scriptDel.count} Script records.`)

          if (scriptDel.count !== scriptsToDeleteIds.length) {
            console.warn(
              `Warning: Expected to delete ${scriptsToDeleteIds.length} scripts, but deleted ${scriptDel.count}. There might be a discrepancy.`
            )
          }
        })
        console.log('\n✅ Successfully deleted duplicate scripts and related data.')
      } catch (error) {
        console.error('\n❌ An error occurred during the deletion transaction:', error)
        console.error('  No changes were made due to transaction rollback.')
      }
    } else {
      console.log('\n🚫 Deletion cancelled by user.')
    }
  }
}

// --- Run the script ---
main()
  .catch(e => {
    console.error('\nScript execution failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log('\nDisconnected from database.')
  })
