// @flow
import * as React from 'react';
import {
  type Filters,
  type TagsTreeNode,
} from '../../Utils/GDevelopServices/Filters';
import TreeView from '@material-ui/lab/TreeView';
import TreeItem from '@material-ui/lab/TreeItem';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import PlaceholderLoader from '../PlaceholderLoader';
import { type FiltersState, type ChosenCategory } from './FiltersChooser';

const nodeIdSeparator = ';-/>'; // A seemingly random string to ensure no clashes with tag names.
const toNodeId = (nodes: Array<TagsTreeNode>) =>
  nodes.map(node => node.name).join(nodeIdSeparator);

const TagsTreeItems = ({
  tagsTreeNodes,
  onChoose,
  parentNodes,
}: {|
  parentNodes: Array<TagsTreeNode>,
  tagsTreeNodes: Array<TagsTreeNode>,
  onChoose: ChosenCategory => void,
|}) => {
  if (!tagsTreeNodes.length) return null;

  return tagsTreeNodes.map(node => {
    const newParentNodes = [...parentNodes, node];
    return (
      <TreeItem
        nodeId={toNodeId(newParentNodes)}
        label={node.name}
        key={node.name}
        onLabelClick={() => onChoose({ node, parentNodes })}
        collapseIcon={node.children.length ? <ExpandMoreIcon /> : null}
        expandIcon={node.children.length ? <ChevronRightIcon /> : null}
      >
        <TagsTreeItems
          tagsTreeNodes={node.children}
          parentNodes={newParentNodes}
          onChoose={onChoose}
        />
      </TreeItem>
    );
  });
};

type MemoizedTagsTreeProps = {|
  allItemsLabel: React.Node,
  chosenCategory: ?ChosenCategory,
  setChosenCategory: (?ChosenCategory) => void,
  onChoiceChange?: () => void,
  allFilters: Filters,
|};

const MemoizedTagsTree = React.memo<MemoizedTagsTreeProps>(function TagsTree({
  allItemsLabel,
  chosenCategory,
  setChosenCategory,
  onChoiceChange,
  allFilters,
}: MemoizedTagsTreeProps) {
  return (
    <TreeView
      selected={
        chosenCategory
          ? toNodeId([...chosenCategory.parentNodes, chosenCategory.node])
          : ''
      }
      defaultExpanded={[]}
      onNodeSelect={() => onChoiceChange && onChoiceChange()}
    >
      <TreeItem
        nodeId=""
        label={allItemsLabel}
        onLabelClick={() => {
          setChosenCategory(null);
          onChoiceChange && onChoiceChange();
        }}
      />
      <TagsTreeItems
        tagsTreeNodes={allFilters.tagsTree}
        onChoose={setChosenCategory}
        parentNodes={[]}
      />
    </TreeView>
  );
});

type Props = {|
  allItemsLabel: React.Node,
  filtersState: FiltersState,
  onChoiceChange?: () => void,
  allFilters: ?Filters,
  error: ?Error,
|};

export const CategoryChooser = ({
  filtersState,
  onChoiceChange,
  allFilters,
  error,
  allItemsLabel,
}: Props) => {
  if (!allFilters) {
    return <PlaceholderLoader />;
  }
  if (error) {
    // Error and retry button shown somewhere else in the UI
    return null;
  }

  return (
    <MemoizedTagsTree
      allItemsLabel={allItemsLabel}
      chosenCategory={filtersState.chosenCategory}
      setChosenCategory={filtersState.setChosenCategory}
      onChoiceChange={onChoiceChange}
      allFilters={allFilters}
    />
  );
};
