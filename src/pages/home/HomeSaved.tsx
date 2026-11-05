import { SavedTab } from '../../components/pages/home/SavedTab/SavedTab';
import type { SavedLayout } from '../../selectors/bookmarks';
import type { HomeRight } from './useTileOpen';
import { useSavedView } from './useSavedView';

interface HomeSavedProps {
    layout: SavedLayout;
    /** 主頁右邊有乜：撳行入頁揀過場用（同格仔一樣，useTileOpen） */
    right: HomeRight;
}

/** 我的收藏 tab：揀中先 render（收藏 / 進度 / 最近收聽只喺呢度計） */
export const HomeSaved = ({ layout, right }: HomeSavedProps) => (
    <SavedTab view={useSavedView(layout, right)} />
);
