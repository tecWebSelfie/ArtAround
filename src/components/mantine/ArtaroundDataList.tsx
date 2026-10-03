import {
  DataList,
  DataListItem,
  DataListItemLabel,
  DataListItemValue,
  DataListProps,
} from '@mantine/core'

export function ArtaroundDataList({
  data,
  ...props
}: { data: Record<string, React.ReactNode | string | number | null> } & Omit<
  DataListProps,
  'children'
>) {
  return (
    <DataList {...props} orientation="vertical">
      {Object.entries(data).map(([label, value]) => (
        <DataListItem key={label}>
          <DataListItemLabel>{label}</DataListItemLabel>
          <DataListItemValue>{value}</DataListItemValue>
        </DataListItem>
      ))}
    </DataList>
  )
}
