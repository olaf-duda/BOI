import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TabTwoScreen from '../app/(tabs)/two'; // Adjust the path to your TabTwoScreen component file

describe('TabTwoScreen', () => {
    it('updates the starting address state on text input', () => {
        // Render the TabTwoScreen component
        const { getByPlaceholderText } = render(<TabTwoScreen />);

        // Get the TextInput for the starting address
        const startingAddressInput = getByPlaceholderText('Enter starting address');

        // Simulate typing a new address into the TextInput
        fireEvent.changeText(startingAddressInput, '123 Main St');

        // Check if the TextInput value has changed
        expect(startingAddressInput.props.value).toBe('123 Main St');
    });
});