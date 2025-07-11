/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { TimezonePicker } from '@app/DateTimePicker/TimezonePicker';
import { defaultServices } from '@app/Shared/Services/Services';
import dayjs, { defaultDatetimeFormat, supportedTimezones, Timezone } from '@i18n/datetime';
import { act, cleanup, screen, waitFor, within } from '@testing-library/react';
import { of } from 'rxjs';
import { render, testT } from '../utils';

const onTimezoneChange = jest.fn((_: Timezone) => undefined);

jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));

describe('<TimezonePicker/>', () => {
  beforeEach(() => {
    jest.mocked(onTimezoneChange).mockReset();
  });

  afterEach(cleanup);

  it('should correctly show selected', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <TimezonePicker selected={supportedTimezones()[0]} onTimezoneChange={onTimezoneChange} />,
          },
        ],
      },
    });

    const displaySelected = screen.getByText(supportedTimezones()[0].full);
    expect(displaySelected).toBeInTheDocument();
    expect(displaySelected).toBeVisible();
  });

  it('should show correct timezone options', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <TimezonePicker selected={supportedTimezones()[0]} onTimezoneChange={onTimezoneChange} />,
          },
        ],
      },
    });

    const optionMenu = screen.getByLabelText(testT('TimezonePicker.ARIA_LABELS.MENU_TOGGLE'));
    expect(optionMenu).toBeInTheDocument();
    expect(optionMenu).toBeVisible();

    await act(async () => {
      await user.click(optionMenu);
    });

    const ul = screen.getByLabelText(testT('TimezonePicker.ARIA_LABELS.SELECT'));
    expect(ul).toBeInTheDocument();
    expect(ul).toBeVisible();

    supportedTimezones()
      .map((t) => t.full)
      .forEach((full) => {
        const option = within(ul).getByText(`(UTC${dayjs().tz(full).format('Z')}) ${full}`);
        expect(option).toBeInTheDocument();
        expect(option).toBeVisible();
      });
  });

  it('should select a timezone when an option is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <TimezonePicker selected={supportedTimezones()[0]} onTimezoneChange={onTimezoneChange} />,
          },
        ],
      },
    });

    const optionMenu = screen.getByLabelText(testT('TimezonePicker.ARIA_LABELS.MENU_TOGGLE'));
    expect(optionMenu).toBeInTheDocument();
    expect(optionMenu).toBeVisible();

    await act(async () => {
      await user.click(optionMenu);
    });

    const ul = screen.getByLabelText(testT('TimezonePicker.ARIA_LABELS.SELECT'));
    expect(ul).toBeInTheDocument();
    expect(ul).toBeVisible();

    const toSelect = supportedTimezones()[1];
    const toSelectText = `(UTC${dayjs().tz(toSelect.full).format('Z')}) ${toSelect.full}`;

    await act(async () => {
      await user.click(within(ul).getByText(toSelectText));
    });

    await waitFor(() => expect(ul).not.toBeVisible());
    expect(onTimezoneChange).toHaveBeenCalledTimes(1);
    expect(onTimezoneChange).toHaveBeenCalledWith(toSelect);
  });
});
