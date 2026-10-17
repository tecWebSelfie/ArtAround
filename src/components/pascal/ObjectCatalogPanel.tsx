'use client'

import { objectLibraryOptions } from '@/lib/model-generation-client'
import { objectAsset } from '@/lib/pascal/object-assets'
import type { Object as MuseumObject } from '@/payload-types'
import { Button, Pagination } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useModals } from '@mantine/modals'
import { activateCatalogItem, ItemsPanel } from '@pascal-app/editor'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ObjectModelGeneration } from './ObjectModelGeneration'
import styles from './object-catalog.module.css'

export function ObjectCatalogPanel() {
  const { t } = useTranslation('map-editor')
  const modals = useModals()
  const [search, setSearch] = useState('')
  const [debouncedSearch] = useDebouncedValue(search, 300)
  const [page, setPage] = useState(1)
  const library = useQuery(objectLibraryOptions(debouncedSearch, page))
  const objects = library.data?.docs ?? []
  const assets = objects.flatMap((object) => {
    const asset = objectAsset(object)
    return asset ? [asset] : []
  })
  const missing = objects.filter((object) => !objectAsset(object))
  function openGeneration(object?: MuseumObject) {
    const modalId = modals.openModal({
      title: object?.name ?? t('Create a new object'),
      size: 'lg',
      closeButtonProps: { 'aria-label': t('Close') },
      children: (
        <ObjectModelGeneration
          object={object}
          onPosition={(asset) => {
            modals.closeModal(modalId)
            activateCatalogItem(asset)
          }}
        />
      ),
    })
  }
  return (
    <section className={styles.panel} aria-label={t('Object catalog')}>
      <header className={styles.header}>
        <h2>{t('Objects')}</h2>
        <Button size="xs" onClick={() => openGeneration()} type="button">
          {t('Create a new object')}
        </Button>
      </header>
      {library.isPending ? (
        <p className={styles.header} role="status">
          {t('Loading objects…')}
        </p>
      ) : null}
      {library.isError ? (
        <p className={styles.header} role="alert">
          {t('Could not load objects.')}{' '}
          <Button variant="default" onClick={() => library.refetch()} type="button">
            {t('Retry')}
          </Button>
        </p>
      ) : null}
      {missing.length > 0 ? (
        <details className={styles.needs} open>
          <summary>
            {t('Needs a model')} ({missing.length})
          </summary>
          <ul className={styles.list}>
            {missing.map((object) => (
              <li key={object.id}>
                <span>{object.name}</span>
                <Button
                  aria-label={t('Generate model for {{name}}', { name: object.name })}
                  size="xs"
                  variant="light"
                  onClick={() => openGeneration(object)}
                  type="button"
                >
                  {t('Generate model')}
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <div className={styles.catalog}>
        <ItemsPanel
          showSourceFilter
          leadingTile={
            <Button size="xs" onClick={() => openGeneration()} type="button">
              {t('Create a new object')}
            </Button>
          }
          items={assets}
          functionTree={[{ slug: 'museum-objects', name: t('Objects'), children: [] }]}
          onSearchChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          searchResults={library.isFetching ? null : assets}
          emptyState={
            <p className={styles.header}>{t('No models ready to position. Create one above.')}</p>
          }
        />
      </div>
      {library.data && library.data.totalPages > 1 ? (
        <nav className={styles.footer} aria-label={t('Object pages')}>
          <Pagination
            total={library.data.totalPages}
            value={page}
            onChange={setPage}
            size="sm"
            layout="responsive"
            autoContrast
            formatLabel={({ page, totalPages }) =>
              t('Page {{page}} of {{totalPages}}', { page, totalPages })
            }
            getItemProps={(page) => ({ 'aria-label': t('Page {{page}}', { page }) })}
            getControlProps={(control) => ({
              'aria-label': {
                first: t('First page'),
                previous: t('Previous'),
                next: t('Next'),
                last: t('Last page'),
              }[control],
            })}
          />
        </nav>
      ) : null}
    </section>
  )
}
