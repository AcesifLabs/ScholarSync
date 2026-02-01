import { Node } from '@xyflow/react';
import { Paper, ReadingList } from './models';

export type PaperNodeData = {
  paper: Paper;
  onFindRelatedAction: (paper: Paper) => void | Promise<void>;
  isSaved: boolean;
  onAddToReadListAction: (paper: Paper, targetListId?: string) => void;
  readLists: ReadingList[];
};

export type PaperNodeType = Node<PaperNodeData, 'paper'>;

export interface GraphHeaderProps {
    nodeCount: number;
    onBack: () => void;
}
