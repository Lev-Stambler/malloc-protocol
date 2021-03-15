import React, { useCallback, useMemo, useState } from "react";
import { Modal, Form, AutoComplete, Button } from 'antd';
import { RegisterCallModal } from '../NewCallModal';
import { useMalloc } from '../../contexts/malloc';

export interface FindCallModalProps {
  isVisible: boolean,
  onCancel: () => void,
  onOk: (name: string) => void
}

export function FindCallModal(props: FindCallModalProps) { 
  const [registerCallVisible, setRegisterCallVisible] = useState(false);
  const malloc = useMalloc();
  const { isVisible, onCancel, onOk } = props;

  const openRegisterCall = () => {
    setRegisterCallVisible(true);
  }

  const closeRegisterCall = () => {
    setRegisterCallVisible(false);
  }

  const getSearchOptions = useCallback(() => {
    return malloc.getCallNames();
  }, [malloc])

  const searchOptions = useMemo(() => getSearchOptions().map(value => ({ value })), [getSearchOptions]);

  return (
    <Modal title="Find Call" visible={isVisible} footer={null} closable={false}>
      <RegisterCallModal isVisible={registerCallVisible} onOk={closeRegisterCall} onCancel={closeRegisterCall}/>
      <Form name="find-call"  onFinish={({ name }) => onOk(name)}>
        <Form.Item name={'name'} label="Search Calls" rules={[{ required: true }]}>
          <AutoComplete
            options={searchOptions}
            filterOption={(inputValue, option) => (
              option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
            )}
          />
        </Form.Item>
        <Form.Item>
          <div className="flex flex-row w-full justify-end">
            <div className="flex-grow justiy-start">
              <Button type="default" onClick={onCancel}>
                Cancel
              </Button>
            </div>
            <Button className="mr-2" type="primary" htmlType="submit">
              Create Node
            </Button>
            <Button type="default" onClick={openRegisterCall}>
              Register New Call
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  )
}

