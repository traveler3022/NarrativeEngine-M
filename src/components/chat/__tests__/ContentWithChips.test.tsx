import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ContentWithChips } from '../ContentWithChips';

describe('ContentWithChips', () => {
    it('renders plain text with markdown', () => {
        const { container } = render(<ContentWithChips content="Hello **world**" />);
        expect(container.textContent).toContain('Hello');
        expect(container.textContent).toContain('world');
    });

    it('renders dice chip for D20 tags', () => {
        const { container } = render(<ContentWithChips content="[D20: COMBAT=Success]" />);
        expect(container.textContent).toContain('D20: COMBAT=Success');
    });

    it('renders event chip for EVENT tags', () => {
        const { container } = render(<ContentWithChips content="[EVENT: AMBUSH (TENSE)]" />);
        expect(container.textContent).toContain('EVENT: AMBUSH (TENSE)');
    });

    it('renders world chip for WORLD_EVENT tags', () => {
        const { container } = render(<ContentWithChips content="[WORLD_EVENT: war declared]" />);
        expect(container.textContent).toContain('WORLD_EVENT: war declared');
    });

    it('renders mixed content with chips and text', () => {
        const { container } = render(<ContentWithChips content="You enter the cave. [D20: COMBAT=Failure] The goblin attacks!" />);
        expect(container.textContent).toContain('You enter the cave.');
        expect(container.textContent).toContain('D20: COMBAT=Failure');
        expect(container.textContent).toContain('The goblin attacks!');
    });

    it('renders SURPRISE tag as event chip', () => {
        const { container } = render(<ContentWithChips content="[SURPRISE EVENT: ODD_SOUND (CURIOUS)]" />);
        expect(container.textContent).toContain('SURPRISE EVENT: ODD_SOUND (CURIOUS)');
    });

    it('renders ENCOUNTER tag as event chip', () => {
        const { container } = render(<ContentWithChips content="[ENCOUNTER EVENT: AMBUSH]" />);
        expect(container.textContent).toContain('ENCOUNTER EVENT: AMBUSH');
    });

    it('renders DICE OUTCOMES as dice chip', () => {
        const { container } = render(<ContentWithChips content="[DICE OUTCOMES: COMBAT=(...)]" />);
        expect(container.textContent).toContain('DICE OUTCOMES: COMBAT=(...)');
    });
});